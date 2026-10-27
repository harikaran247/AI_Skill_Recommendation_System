"""
Admin Creation / Promotion Utility Script

Usage:
    python backend/create_admin.py --email admin@example.com --name "System Admin" --password "Admin@12345"

Or interactive mode:
    python backend/create_admin.py
"""

import os
import sys
import argparse
import getpass

# Add backend directory to path if needed
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import get_user_by_email, create_user, get_db
from auth import hash_password, validate_email, validate_password_strength

def create_or_upgrade_admin(email, full_name, password):
    email = email.strip().lower()
    full_name = full_name.strip()
    
    if not validate_email(email):
        print(f"[-] Error: Invalid email address format: '{email}'")
        return False
        
    is_valid, err, _ = validate_password_strength(password)
    if not is_valid:
        print(f"[-] Error: {err}")
        return False
        
    pwd_hash = hash_password(password)
    existing = get_user_by_email(email)
    
    if existing:
        # User already exists - upgrade role to admin and optionally update password
        db_conn = get_db()
        if db_conn is not None:
            db_conn['users'].update_one(
                {'email': email},
                {'$set': {
                    'role': 'admin',
                    'password_hash': pwd_hash,
                    'full_name': full_name or existing.get('full_name'),
                    'status': 'active'
                }}
            )
        try:
            from database import get_sqlite_conn
            conn = get_sqlite_conn()
            cur = conn.cursor()
            cur.execute("UPDATE users SET role = 'admin', password_hash = ?, full_name = ?, status = 'active' WHERE email = ?", (pwd_hash, full_name or existing.get('full_name'), email))
            conn.commit()
            conn.close()
        except Exception:
            pass
        print(f"[+] Successfully promoted existing user '{email}' (ID: {existing['id']}) to ADMIN role.")
        return True
    else:
        # Create fresh admin user
        user_id = create_user(
            full_name=full_name,
            email=email,
            password_hash=pwd_hash,
            role='admin'
        )
        print(f"[+] Successfully created new Administrator account:")
        print(f"    - ID:        {user_id}")
        print(f"    - Full Name: {full_name}")
        print(f"    - Email:     {email}")
        print(f"    - Role:      admin")
        return True

def main():
    parser = argparse.ArgumentParser(description="Create or promote an administrator account for Skill Recommendation System.")
    parser.add_argument("--email", help="Administrator email address")
    parser.add_argument("--name", help="Administrator full name")
    parser.add_argument("--password", help="Administrator password")
    
    args = parser.parse_args()
    
    email = args.email
    name = args.name
    password = args.password
    
    if not email:
        print("--- Create Administrator Account ---")
        try:
            email = input("Admin Email: ").strip()
            name = input("Admin Full Name: ").strip()
            password = getpass.getpass("Admin Password: ").strip()
            confirm = getpass.getpass("Confirm Password: ").strip()
            if password != confirm:
                print("[-] Error: Passwords do not match.")
                sys.exit(1)
        except (KeyboardInterrupt, EOFError):
            print("\nOperation cancelled.")
            sys.exit(0)
            
    if not name:
        name = "System Administrator"
        
    success = create_or_upgrade_admin(email, name, password)
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()

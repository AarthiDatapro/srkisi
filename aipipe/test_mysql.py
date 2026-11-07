from db import get_db_connection


try:
    connection = get_db_connection()

    cursor = connection.cursor()

    cursor.execute("SELECT DATABASE()")

    result = cursor.fetchone()

    print("MySQL connection successful!")
    print("Database:", result[0])

    cursor.close()
    connection.close()

except Exception as e:
    print("MySQL connection failed:")
    print(type(e).__name__)
    print(e)
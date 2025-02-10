from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import List
import asyncpg
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI()

# Get DATABASE_URL from environment variables
DATABASE_URL = os.getenv("DATABASE_URL")

# Async database connection function
async def get_db_connection():
    return await asyncpg.connect(DATABASE_URL + "?sslmode=require")

# Data model
class JournalEntry(BaseModel):
    entry: str

# Route to add an entry
@app.post("/add_entry")
async def add_entry(entry: JournalEntry):
    timestamp = datetime.utcnow().isoformat()
    conn = await get_db_connection()
    try:
        await conn.execute(
            "INSERT INTO journal_entries (entry, created_at) VALUES ($1, $2)", 
            entry.entry, timestamp
        )
        return {"message": "Entry added successfully", "timestamp": timestamp}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await conn.close()

# Route to get all entries
@app.get("/get_entries", response_model=List[JournalEntry])
async def get_entries():
    conn = await get_db_connection()
    try:
        rows = await conn.fetch("SELECT entry FROM journal_entries ORDER BY created_at DESC")
        return [{"entry": row["entry"]} for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await conn.close()

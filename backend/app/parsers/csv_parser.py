from pathlib import Path
from typing import Dict, Any, List
import pandas as pd
from backend.app.core.logging import logger

def parse_csv(file_path: Path) -> Dict[str, Any]:
    """
    Parses a CSV file using pandas.
    Extracts column headers, row counts, sample data, and generates document chunks.
    """
    try:
        df = pd.read_csv(file_path)
        row_count = len(df)
        columns = list(df.columns)
        
        # Convert first few rows to dict for sample metadata
        sample_rows = df.head(5).to_dict(orient="records")
        
        # Create chunk representation preserving row ranges
        chunks: List[Dict[str, Any]] = []
        chunk_size = 50  # Rows per chunk
        
        for i in range(0, row_count, chunk_size):
            sub_df = df.iloc[i : i + chunk_size]
            sub_text = sub_df.to_csv(index=True)
            row_start = i
            row_end = min(i + chunk_size - 1, row_count - 1)
            
            chunks.append({
                "chunk_index": len(chunks),
                "page_number": None,
                "content": sub_text,
                "metadata_json": {
                    "filename": file_path.name,
                    "row_start": row_start,
                    "row_end": row_end,
                    "row_count": len(sub_df),
                    "columns": columns
                }
            })
            
        metadata = {
            "row_count": row_count,
            "column_count": len(columns),
            "columns": columns,
            "sample_rows": sample_rows
        }
        
        return {
            "success": True,
            "metadata": metadata,
            "chunks": chunks,
            "error": None
        }
    except Exception as e:
        logger.error(f"Error parsing CSV {file_path}: {e}")
        return {
            "success": False,
            "metadata": {},
            "chunks": [],
            "error": str(e)
        }

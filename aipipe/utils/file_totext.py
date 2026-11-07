def extract_text_fromfile(file_path: str) -> str:
    """
    Extract text from PDF, DOCX, PPTX, or TXT file.

    Parameters
    ----------
    file_path : str
        Path to the file.

    Returns
    -------
    str
        Extracted text.
    """
    from pathlib import Path
    import fitz  # PyMuPDF
    from docx import Document
    from pptx import Presentation

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    extension = path.suffix.lower()

    # ------------------------------------------------------
    # TXT
    # ------------------------------------------------------
    if extension == ".txt":
        return path.read_text(
            encoding="utf-8",
            errors="ignore"
        ).strip()

    # ------------------------------------------------------
    # PDF
    # ------------------------------------------------------
    elif extension == ".pdf":
        text_parts = []

        with fitz.open(path) as pdf:
            for page in pdf:
                text = page.get_text()

                if text:
                    text_parts.append(text)

        return "\n".join(text_parts).strip()

    # ------------------------------------------------------
    # DOCX
    # ------------------------------------------------------
    elif extension == ".docx":
        document = Document(path)
        paragraphs = []

        # Extract paragraphs
        for paragraph in document.paragraphs:
            text = paragraph.text.strip()

            if text:
                paragraphs.append(text)

        # Extract table content
        for table in document.tables:
            for row in table.rows:
                row_text = [
                    cell.text.strip()
                    for cell in row.cells
                    if cell.text.strip()
                ]

                if row_text:
                    paragraphs.append(" | ".join(row_text))

        return "\n".join(paragraphs).strip()

    # ------------------------------------------------------
    # PPTX
    # ------------------------------------------------------
    elif extension == ".pptx":
        presentation = Presentation(path)
        slides_text = []

        for slide_number, slide in enumerate(
            presentation.slides, start=1
        ):
            slide_parts = []

            for shape in slide.shapes:

                # Extract text from text boxes and placeholders
                if shape.has_text_frame:
                    text = shape.text.strip()

                    if text:
                        slide_parts.append(text)

                # Extract table content
                if shape.has_table:
                    for row in shape.table.rows:
                        row_text = [
                            cell.text.strip()
                            for cell in row.cells
                            if cell.text.strip()
                        ]

                        if row_text:
                            slide_parts.append(" | ".join(row_text))

            if slide_parts:
                slides_text.append(
                    f"Slide {slide_number}\n"
                    + "\n".join(slide_parts)
                )

        return "\n\n".join(slides_text).strip()

    # ------------------------------------------------------
    # Unsupported
    # ------------------------------------------------------
    else:
        raise ValueError(
            f"Unsupported file format: {extension}. "
            "Supported formats are PDF, DOCX, PPTX and TXT."
        )
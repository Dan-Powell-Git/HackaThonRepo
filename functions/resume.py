"""Extract resume text in memory; uploaded files are never saved."""
import io
from pathlib import Path
from zipfile import ZipFile, BadZipFile
from xml.etree import ElementTree

MAX_FILE_BYTES = 2 * 1024 * 1024
MAX_TEXT = 25000


def extract_resume(data, filename):
    if not data or len(data) > MAX_FILE_BYTES:
        raise ValueError('Choose a resume under 2 MB.')
    suffix = Path(filename or '').suffix.lower()
    try:
        if suffix in ('.txt', '.md'):
            text = data.decode('utf-8-sig')
        elif suffix == '.docx':
            with ZipFile(io.BytesIO(data)) as archive:
                info = archive.getinfo('word/document.xml')
                if info.file_size > 2_000_000:
                    raise ValueError('This Word document is too large to read. Try a text export.')
                document = ElementTree.fromstring(archive.read(info))
                ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
                text = '\n'.join(''.join(p.itertext()) for p in document.findall('.//w:p', ns))
        elif suffix == '.pdf':
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(data), strict=True)
            if reader.is_encrypted:
                raise ValueError('Please upload an unlocked PDF or a text resume.')
            if len(reader.pages) > 15:
                raise ValueError('Please upload a resume with 15 pages or fewer.')
            text = '\n'.join(page.extract_text() or '' for page in reader.pages)
        else:
            raise ValueError('Choose a PDF, Word (.docx), or text (.txt/.md) resume.')
    except ValueError:
        raise
    except (UnicodeError, BadZipFile, KeyError, ElementTree.ParseError):
        raise ValueError('This file could not be read. Try a PDF, DOCX, or UTF-8 text export.') from None
    except Exception:
        raise ValueError('This resume could not be read. Try a text export instead.') from None
    text = text.strip()
    if not text:
        raise ValueError('No readable text was found. For scanned PDFs, upload a text or Word version.')
    if len(text) > MAX_TEXT:
        raise ValueError('Please shorten your resume to 25,000 characters.')
    return text

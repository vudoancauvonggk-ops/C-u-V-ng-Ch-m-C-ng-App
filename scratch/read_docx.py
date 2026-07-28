import zipfile
import xml.etree.ElementTree as ET
import sys
import os

def read_docx(path):
    print(f"=== READING: {path} ===")
    try:
        with zipfile.ZipFile(path, 'r') as z:
            xml_content = z.read('word/document.xml')
            root = ET.fromstring(xml_content)
            
            # Namespace for Word processing ML
            namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            # Extract paragraphs and tables
            for elem in root.iter():
                if elem.tag.endswith('p'):
                    texts = [node.text for node in elem.iter() if node.text]
                    if texts:
                        print("P:", "".join(texts))
                elif elem.tag.endswith('tr'):
                    cells = []
                    for tc in elem.findall('.//w:tc', namespaces):
                        cell_text = "".join([node.text for node in tc.iter() if node.text])
                        cells.append(cell_text.strip())
                    if any(cells):
                        print("ROW:", " | ".join(cells))
    except Exception as e:
        print(f"Error reading {path}: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        read_docx(sys.argv[1])

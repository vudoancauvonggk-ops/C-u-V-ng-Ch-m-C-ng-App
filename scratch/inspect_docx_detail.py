import zipfile
import xml.etree.ElementTree as ET
import sys
import glob
import os

def inspect_file(filepath):
    print(f"\n==========================================")
    print(f"FILE: {filepath}")
    print(f"==========================================")
    try:
        with zipfile.ZipFile(filepath, 'r') as z:
            xml_content = z.read('word/document.xml')
            root = ET.fromstring(xml_content)
            
            # Print paragraphs and tables in order
            for child in root.iter():
                tag = child.tag.split('}')[-1]
                if tag == 'p':
                    text = "".join([t.text for t in child.iter() if t.text and t.text.strip()])
                    if text:
                        print(f"P: {text}")
                elif tag == 'tbl':
                    print("--- TABLE START ---")
                    for row in child.findall('.//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tr'):
                        cells = []
                        for cell in row.findall('.//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tc'):
                            cell_text = "".join([t.text for t in cell.iter() if t.text])
                            cells.append(cell_text.strip())
                        print("  ROW | " + " | ".join(cells))
                    print("--- TABLE END ---")
    except Exception as e:
        print(f"Could not parse docx: {e}")

if __name__ == "__main__":
    folder = r"D:\Aerobic\Hợp Đồng 2023-2026\Hợp Đồng 2026"
    for root_dir, dirs, files in os.walk(folder):
        for file in files:
            if file.endswith(".docx"):
                inspect_file(os.path.join(root_dir, file))

import zipfile
import xml.etree.ElementTree as ET
import os
import glob
import json
import re

folder = r"D:\Aerobic\Hợp Đồng 2023-2026\Hợp Đồng 2026"

docx_files = glob.glob(os.path.join(folder, "*.docx"))

print(f"Found {len(docx_files)} docx files in main directory:")
for f in sorted(docx_files):
    print(" - ", os.path.basename(f))

contracts = []

def parse_contract(filepath):
    filename = os.path.basename(filepath)
    try:
        with zipfile.ZipFile(filepath, 'r') as z:
            xml_content = z.read('word/document.xml')
            root = ET.fromstring(xml_content)
            
            paragraphs = []
            for child in root.iter():
                tag = child.tag.split('}')[-1]
                if tag == 'p':
                    text = "".join([t.text for t in child.iter() if t.text and t.text.strip()])
                    if text:
                        paragraphs.append(text)
            
            full_text = "\n".join(paragraphs)
            
            # Extract info using regex or text pattern matching
            print(f"\n=============================================")
            print(f"FILE: {filename}")
            print(f"=============================================")
            
            # Print title, contract number, dates, side B
            for p in paragraphs[:25]:
                print("  ", p)
                
    except Exception as e:
        print(f"Error parsing {filename}: {e}")

for f in sorted(docx_files):
    parse_contract(f)

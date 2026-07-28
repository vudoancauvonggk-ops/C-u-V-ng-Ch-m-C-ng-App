import zipfile
import xml.etree.ElementTree as ET
import os
import glob
import json
import re

folder = r"D:\Aerobic\Hợp Đồng 2023-2026\Hợp Đồng 2026"

contracts_data = []

def extract_from_docx(filepath):
    filename = os.path.basename(filepath)
    if filename.startswith("~$") or not filename.endswith(".docx"):
        return None
        
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
            
            text_block = "\n".join(paragraphs)
            
            # Find contract number
            contract_no = ""
            m_no = re.search(r'(?:Số|Số:)\s*([0-9A-Za-z\/\-\._]+)', text_block)
            if m_no:
                contract_no = m_no.group(1).strip()

            # Find date: ngày X tháng Y năm Z
            contract_date = ""
            m_date = re.search(r'ngày\s*(\d{1,2})\s*tháng\s*(\d{1,2})\s*năm\s*(\d{4})', text_block, re.IGNORECASE)
            if m_date:
                dd, mm, yyyy = m_date.groups()
                contract_date = f"{yyyy}-{int(mm):02d}-{int(dd):02d}"

            # Side B info
            b_name = ""
            b_address = ""
            b_phone = ""
            b_tax = ""
            b_rep = ""
            b_pos = "Hiệu Trưởng"

            in_b = False
            for p in paragraphs:
                if "Bên B" in p or "BÊN B" in p or "bên B" in p:
                    in_b = True
                    if ":" in p:
                        b_name = p.split(":", 1)[1].strip()
                    continue
                if in_b:
                    if "ĐIỀU 1" in p or "Điều 1" in p or "Bên A" in p or "BÊN A" in p:
                        break
                    
                    if "Địa chỉ" in p or "Địa chỉ:" in p:
                        b_address = p.split(":", 1)[-1].strip() if ":" in p else p
                    elif "Điện thoại" in p or "Điện thoại:" in p or "ĐT:" in p:
                        if "Mã Số Thuế" in p or "MST" in p or "Mã số thuế" in p:
                            parts = re.split(r'Mã Số Thuế|MST|Mã số thuế', p, flags=re.IGNORECASE)
                            b_phone = parts[0].split(":", 1)[-1].strip() if ":" in parts[0] else parts[0]
                            b_tax = parts[1].split(":", 1)[-1].strip() if ":" in parts[1] else parts[1]
                        else:
                            b_phone = p.split(":", 1)[-1].strip() if ":" in p else p
                    elif "Mã số thuế" in p or "Mã Số Thuế" in p or "MST" in p:
                        b_tax = p.split(":", 1)[-1].strip() if ":" in p else p
                    elif "Đại diện" in p or "Người đại diện" in p:
                        if "Chức vụ" in p or "Chức Vụ" in p:
                            parts = re.split(r'Chức vụ|Chức Vụ', p, flags=re.IGNORECASE)
                            b_rep = parts[0].split(":", 1)[-1].strip() if ":" in parts[0] else parts[0]
                            b_pos = parts[1].split(":", 1)[-1].strip() if ":" in parts[1] else parts[1]
                        else:
                            b_rep = p.split(":", 1)[-1].strip() if ":" in parts[0] else parts[0]
                    elif "Chức vụ" in p or "Chức Vụ" in p:
                        b_pos = p.split(":", 1)[-1].strip() if ":" in p else p

            return {
                "file": filename,
                "path": filepath,
                "contractNo": contract_no,
                "contractDate": contract_date,
                "b_name": b_name,
                "b_address": b_address,
                "b_phone": b_phone,
                "b_tax": b_tax,
                "b_rep": b_rep,
                "b_pos": b_pos,
                "paragraphs": paragraphs[:15]
            }

    except Exception as e:
        print(f"Error {filename}: {e}")
        return None

# Walk all files
for root_dir, dirs, files in os.walk(folder):
    for f in sorted(files):
        if f.endswith(".docx") and not f.startswith("~$"):
            res = extract_from_docx(os.path.join(root_dir, f))
            if res:
                contracts_data.append(res)

with open("scratch/contracts_dump.json", "w", encoding="utf-8") as out:
    json.dump(contracts_data, out, ensure_ascii=False, indent=2)

print(f"Extracted {len(contracts_data)} contract documents.")

import json

with open("scratch/contracts_dump.json", "r", encoding="utf-8") as f:
    items = json.load(f)

for item in items:
    print("--------------------------------------------------")
    print(f"FILE: {item['file']}")
    print(f"Contract No: {item['contractNo']}")
    print(f"Contract Date: {item['contractDate']}")
    print(f"B Name: {item['b_name']}")
    print(f"B Address: {item['b_address']}")
    print(f"B Phone: {item['b_phone']}")
    print(f"B Tax: {item['b_tax']}")
    print(f"B Representative: {item['b_rep']} ({item['b_pos']})")

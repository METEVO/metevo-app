import re

names = ["AUTH-03", "AUTH-CHECK", "AUTH-ERROR", "AUTH-FIELDS", "IMPORT-CHECK",
         "IMPORT-INVALID", "IMPORT-SAVED", "IMPORT-SAVING", "IMPORT-ERROR"]
for name in names:
    path = f"/home/aballarini/metevo-hack/design/screens/dark/{name}.svg"
    text = open(path).read()
    words = re.findall(r'<text[^>]*>([^<]+)</text>', text)
    print("==", name, ":", " | ".join(words[:16]))

import ast

with open("/home/aballarini/metevo-hack/metevo-app/scripts/mobile_helper.py") as handle:
    ast.parse(handle.read())
print("PY_OK")

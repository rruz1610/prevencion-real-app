import requests
import time
import json

base_url = "http://localhost:8000/api"
session = requests.Session()

def measure_time(func, *args, **kwargs):
    start = time.time()
    response = func(*args, **kwargs)
    end = time.time()
    return response, end - start

print("--- BENCHMARK TEST ---")
login_data = {"rut": "15.367.481-7", "clave": "2308"}
res, t = measure_time(session.post, f"{base_url}/login", json=login_data)
print(f"Login Time: {t:.4f} seconds")
if res.status_code != 200:
    print("Login failed!", res.text)
    exit(1)

token = res.json().get("token")
session.headers.update({"Authorization": f"Bearer {token}"})

# Test GET /empresas
res, t = measure_time(session.get, f"{base_url}/empresas")
print(f"GET /empresas Time: {t:.4f} seconds | Items: {len(res.json()) if res.status_code == 200 else 0}")

# Test GET /obras
res, t = measure_time(session.get, f"{base_url}/obras")
print(f"GET /obras Time: {t:.4f} seconds | Items: {len(res.json()) if res.status_code == 200 else 0}")

# Test GET /gerentes
res, t = measure_time(session.get, f"{base_url}/gerentes")
print(f"GET /gerentes Time: {t:.4f} seconds | Items: {len(res.json()) if res.status_code == 200 else 0}")

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

response = client.post("/api/entregas/solicitar-codigo", json={
    "trabajador_id": "89b52009-46b5-4ee9-96e6-8b45532eab0a", # just a guess, need a real worker id
    "tipo_documento": "ODI",
    "descripcion": "Test",
    "metodo_envio": "email",
    "empresa_id": "89b52009-46b5-4ee9-96e6-8b45532eab0a"
})

print(response.status_code)
print(response.json())

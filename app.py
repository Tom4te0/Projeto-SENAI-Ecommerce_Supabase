import os
from decimal import Decimal, InvalidOperation
import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request

load_dotenv()
app = Flask(__name__)
SUPABASE_URL = os.getenv("").rstrip("/")
SUPABASE_SECRET_KEY = os.getenv("")


def supabase(metodo, tabela, params=None, dados=None):
    r = requests.request(metodo, f"{SUPABASE_URL}/rest/v1/{tabela}", headers={"apikey": SUPABASE_SECRET_KEY, "content-type": "application/json", "prefer": "return=representation"}, params=params, json=dados, timeout=10)
    r.raise_for_status()
    return r.json()


@app.before_request
def check():
    if request.path.startswith("/api/") and not (SUPABASE_URL and SUPABASE_SECRET_KEY):
        return jsonify(mensagem="configure a url e a chave do supabase"), 503


@app.get("/")
def inicio():
    return render_template("index.html")


@app.get("/api/categorias")
def cats():
    return jsonify(supabase("GET", "categorias", {"select": "categoria_id,nome", "order": "nome.asc"}))


@app.get("/api/produtos")
def prods():
    return jsonify(supabase("GET", "produtos", {"select": "produto_id, nome, preco, estoque, categorias(nome)", "order": "produto_id.desc"}))


@app.post("/api/produtos")
def add_produto():
    dados = request.get_json(silent=True)
    if not isinstance(dados, dict):
        return jsonify(mensagem="Envie um objeto JSON válido."), 400

    nome = str(dados.get("nome") or "").strip()
    preco = str(dados.get("preco") or "").strip().replace(",", ".")
    estoque = str(dados.get("estoque") or "").strip()
    categoria_id = str(dados.get("categoria_id") or "").strip()

    if len(nome) < 3 or len(nome) > 80:
        return jsonify(mensagem="Nome deve ter de 3 a 80 caracteres"), 400

    try:
        valor = Decimal(preco)
        qtd = int(estoque)
        cat = int(categoria_id)
    except (InvalidOperation, ValueError):
        return jsonify(mensagem="Informe preço numérico, estoque inteiro e categoria válida!"), 400

    if valor <= 0 or valor > Decimal("999999.99"):
        return jsonify(mensagem="o preço deve estar entre R$ 0,01 e R$ 999999,99"), 400
    if qtd < 0 or qtd > 1000000:
        return jsonify(mensagem="o Estoque deve estar entre 0 e 1000000 unidades"), 400
    if not supabase("GET", "categorias", {"select": "categoria_id", "categoria_id": f"eq.{cat}"}):
        return jsonify(mensagem="a categoria informada não existe "), 400

    supabase("POST", "produtos", dados={"nome": nome, "preco": str(valor), "estoque": qtd, "categoria_id": cat})
    return jsonify(mensagem="produto cadastrado com sucesso"), 201


@app.get("/api/clientes")
def clientes():
    return jsonify(supabase("GET", "clientes", {"select": "cliente_id,nome,email,telefone", "order": "nome.asc"}))


@app.post("/api/clientes")
def add_cliente():
    dados = request.get_json(silent=True)
    if not isinstance(dados, dict):
        return jsonify(mensagem="Envie um objeto JSON válido."), 400

    nome = str(dados.get("nome") or "").strip()
    email = str(dados.get("email") or "").strip()
    telefone = str(dados.get("telefone") or "").strip()

    if not nome or not email:
        return jsonify(mensagem="Nome e e-mail são obrigatórios."), 400
    if "@" not in email or "." not in email.rsplit("@", 1)[-1]:
        return jsonify(mensagem="Informe um e-mail válido."), 400

    try:
        supabase("POST", "clientes", dados={"nome": nome, "email": email.lower(), "telefone": telefone or None})
    except requests.exceptions.RequestException as erro:
        if isinstance(erro, requests.exceptions.HTTPError):
            try:
                detalhe = erro.response.json()
            except ValueError:
                detalhe = {}
            if isinstance(detalhe, dict) and detalhe.get("code") == "23505":
                return jsonify(mensagem="Já existe um cliente cadastrado com este e-mail."), 409
        raise
    return jsonify(mensagem="Cliente cadastrado com sucesso."), 201


@app.get("/api/carrinho")
def carrinho():
    cliente_id = request.args.get("cliente_id", type=int)
    if cliente_id is None:
        return jsonify(mensagem="Selecione um cliente para consultar o carrinho."), 400

    itens = supabase("GET", "carrinho", {"select": "carrinho_id, cliente_id, produto_id, quantidade, produtos(produto_id, nome, preco)", "cliente_id": f"eq.{cliente_id}", "order": "carrinho_id.asc"})
    lista = []
    total = Decimal("0")
    for item in itens:
        prod = item.get("produtos") or {}
        qtd = int(item.get("quantidade") or 0)
        valor = Decimal(str(prod.get("preco") or "0"))
        subtotal = valor * qtd
        total += subtotal
        lista.append({"carrinho_id": item.get("carrinho_id"), "produto_id": item.get("produto_id"), "nome": prod.get("nome") or "Produto não localizado", "quantidade": qtd, "preco_unitario": float(valor), "subtotal": float(subtotal)})
    return jsonify({"itens": lista, "total": float(total)})


@app.post("/api/carrinho")
def add_carrinho():
    dados = request.get_json(silent=True)
    if not isinstance(dados, dict):
        return jsonify(mensagem="Envie um objeto JSON válido."), 400

    try:
        cliente_id = int(dados.get("cliente_id"))
        produto_id = int(dados.get("produto_id"))
        quantidade = int(dados.get("quantidade"))
    except (TypeError, ValueError):
        return jsonify(mensagem="Cliente, produto e quantidade são obrigatórios."), 400

    if cliente_id <= 0 or produto_id <= 0:
        return jsonify(mensagem="Selecione um cliente e um produto válidos."), 400
    if quantidade <= 0:
        return jsonify(mensagem="A quantidade deve ser maior que zero."), 400
    if not supabase("GET", "clientes", {"select": "cliente_id", "cliente_id": f"eq.{cliente_id}"}):
        return jsonify(mensagem="O cliente informado não está cadastrado."), 404
    if not supabase("GET", "produtos", {"select": "produto_id", "produto_id": f"eq.{produto_id}"}):
        return jsonify(mensagem="O produto informado não foi encontrado."), 404
    if supabase("GET", "carrinho", {"select": "carrinho_id", "cliente_id": f"eq.{cliente_id}", "produto_id": f"eq.{produto_id}"}):
        return jsonify(mensagem="Este produto já está no carrinho do cliente."), 409

    supabase("POST", "carrinho", dados={"cliente_id": cliente_id, "produto_id": produto_id, "quantidade": quantidade})
    return jsonify(mensagem="Produto adicionado ao carrinho com sucesso."), 201


@app.delete("/api/carrinho/<int:carrinho_id>")
def del_item(carrinho_id):
    if not supabase("GET", "carrinho", {"select": "carrinho_id", "carrinho_id": f"eq.{carrinho_id}"}):
        return jsonify(mensagem="Item do carrinho não encontrado."), 404
    supabase("DELETE", "carrinho", {"carrinho_id": f"eq.{carrinho_id}"})
    return jsonify(mensagem="Item removido do carrinho com sucesso."), 200


@app.errorhandler(requests.exceptions.RequestException)
def tratador(erro):
    if isinstance(erro, requests.exceptions.HTTPError):
        try:
            detalhe = erro.response.json()
        except ValueError:
            detalhe = {}
        if isinstance(detalhe, dict):
            codigo = detalhe.get("code")
            if codigo == "23505":
                return jsonify(mensagem="já existe um registro com estes dados"), 409
            if codigo == "23514":
                return jsonify(mensagem="os dados não atendem às regras do banco"), 400
    return jsonify(mensagem="não foi possível acessar o banco, tente novamente"), 503


@app.errorhandler(500)
def erro500(erro):
    app.logger.exception("erro interno inesperado: %s", erro)
    return jsonify(mensagem="ocorreu uma falha interna"), 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)


const formProduto = document.getElementById("formulario");
const msgProduto = document.getElementById("mensagem");
const msgLista = document.getElementById("mensagem-lista");
const listaProdutos = document.getElementById("lista-produtos");
const categoria = document.getElementById("categoria");
const botaoProduto = document.getElementById("botao-cadastrar");
const formCliente = document.getElementById("formulario-cliente");
const msgCliente = document.getElementById("mensagem-cliente");
const cliente = document.getElementById("cliente");
const produto = document.getElementById("produto-carrinho");
const formCarrinho = document.getElementById("formulario-carrinho");
const msgCarrinho = document.getElementById("mensagem-carrinho");
const carrinho = document.getElementById("lista-carrinho");
const total = document.getElementById("total-carrinho");

function mostrar(el, texto, ok) {
  el.textContent = texto;
  el.className = ok ? "mensagem sucesso" : "mensagem erro";
}

async function carregarCategorias() {
  try {
    const r = await fetch("/api/categorias");
    const dados = await r.json();
    if (!r.ok) {
      mostrar(msgProduto, dados.mensagem, false);
      return;
    }
    categoria.replaceChildren();
    const padrao = document.createElement("option");
    padrao.value = "";
    padrao.textContent = "Selecione uma categoria";
    categoria.appendChild(padrao);
    for (const item of dados) {
      const op = document.createElement("option");
      op.value = item.categoria_id;
      op.textContent = item.nome;
      categoria.appendChild(op);
    }
  } catch {
    mostrar(msgProduto, "Não foi possível carregar as categorias.", false);
  }
}

async function carregarProdutos() {
  msgLista.textContent = "Consultando produtos...";
  try {
    const r = await fetch("/api/produtos");
    const dados = await r.json();
    if (!r.ok) {
      msgLista.textContent = dados.mensagem;
      return;
    }
    listaProdutos.replaceChildren();
    produto.replaceChildren();
    const padrao = document.createElement("option");
    padrao.value = "";
    padrao.textContent = "Selecione um produto";
    produto.appendChild(padrao);

    for (const p of dados) {
      const tr = document.createElement("tr");
      const valores = [
        p.nome,
        p.categorias ? p.categorias.nome : "Sem categoria",
        Number(p.preco).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        }),
        p.estoque,
      ];
      for (const v of valores) {
        const td = document.createElement("td");
        td.textContent = v;
        tr.appendChild(td);
      }
      listaProdutos.appendChild(tr);

      const op = document.createElement("option");
      op.value = p.produto_id;
      op.textContent = `${p.nome} - ${Number(p.preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
      produto.appendChild(op);
    }
    msgLista.textContent =
      dados.length === 0 ? "Nenhum produto cadastrado." : "Lista atualizada.";
  } catch {
    msgLista.textContent =
      "Não foi possível atualizar a lista. Confira o servidor.";
  }
}

async function cadastrarProduto(evento) {
  evento.preventDefault();
  botaoProduto.disabled = true;
  mostrar(msgProduto, "Enviando dados...", true);

  const novoProduto = {
    nome: document.getElementById("nome").value,
    categoria_id: categoria.value,
    preco: document.getElementById("preco").value,
    estoque: document.getElementById("estoque").value,
  };

  try {
    const r = await fetch("/api/produtos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(novoProduto),
    });
    const dados = await r.json();
    mostrar(msgProduto, dados.mensagem, r.ok);
    if (r.ok) {
      formProduto.reset();
      await carregarProdutos();
    }
  } catch {
    mostrar(msgProduto, "Não foi possível confirmar o cadastro.", false);
  } finally {
    botaoProduto.disabled = false;
  }
}

async function carregarClientes() {
  try {
    const r = await fetch("/api/clientes");
    const dados = await r.json();
    if (!r.ok) {
      mostrar(msgCliente, dados.mensagem, false);
      return;
    }
    cliente.replaceChildren();
    const padrao = document.createElement("option");
    padrao.value = "";
    padrao.textContent = "Selecione um cliente";
    cliente.appendChild(padrao);
    for (const c of dados) {
      const op = document.createElement("option");
      op.value = c.cliente_id;
      op.textContent = `${c.nome} (${c.email})`;
      cliente.appendChild(op);
    }
  } catch {
    mostrar(msgCliente, "Não foi possível carregar os clientes.", false);
  }
}

async function cadastrarCliente(evento) {
  evento.preventDefault();
  const botao = document.getElementById("botao-cadastrar-cliente");
  botao.disabled = true;
  mostrar(msgCliente, "Enviando dados...", true);

  const novoCliente = {
    nome: document.getElementById("cliente-nome").value,
    email: document.getElementById("cliente-email").value,
    telefone: document.getElementById("cliente-telefone").value,
  };

  try {
    const r = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(novoCliente),
    });
    const dados = await r.json();
    mostrar(msgCliente, dados.mensagem, r.ok);
    if (r.ok) {
      formCliente.reset();
      await carregarClientes();
    }
  } catch {
    mostrar(
      msgCliente,
      "Não foi possível confirmar o cadastro do cliente.",
      false,
    );
  } finally {
    botao.disabled = false;
  }
}

function renderCarrinho(itens, valorTotal) {
  carrinho.replaceChildren();
  if (!itens.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = "Nenhum item no carrinho para este cliente.";
    tr.appendChild(td);
    carrinho.appendChild(tr);
    total.textContent = "R$ 0,00";
    return;
  }

  for (const item of itens) {
    const tr = document.createElement("tr");
    const valores = [
      item.nome,
      item.quantidade,
      Number(item.preco_unitario).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
      Number(item.subtotal).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
    ];
    for (const valor of valores) {
      const td = document.createElement("td");
      td.textContent = valor;
      tr.appendChild(td);
    }

    const td = document.createElement("td");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "remover-item";
    btn.textContent = "Remover";
    btn.dataset.id = item.carrinho_id;
    btn.addEventListener("click", removerItem);
    td.appendChild(btn);
    tr.appendChild(td);
    carrinho.appendChild(tr);
  }
  total.textContent = Number(valorTotal).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

async function carregarCarrinho() {
  const id = cliente.value;
  if (!id) {
    renderCarrinho([], 0);
    return;
  }
  try {
    const r = await fetch(`/api/carrinho?cliente_id=${id}`);
    const dados = await r.json();
    if (!r.ok) {
      mostrar(msgCarrinho, dados.mensagem, false);
      renderCarrinho([], 0);
      return;
    }
    renderCarrinho(dados.itens || [], Number(dados.total || 0));
    mostrar(msgCarrinho, "Carrinho atualizado.", true);
  } catch {
    mostrar(msgCarrinho, "Não foi possível consultar o carrinho.", false);
  }
}

async function addNoCarrinho(evento) {
  evento.preventDefault();
  const clienteId = cliente.value;
  const produtoId = produto.value;
  const quantidade = document.getElementById("quantidade-carrinho").value;

  if (!clienteId) {
    mostrar(
      msgCarrinho,
      "Selecione um cliente antes de adicionar o produto.",
      false,
    );
    return;
  }
  if (!produtoId) {
    mostrar(
      msgCarrinho,
      "Selecione um produto para adicionar ao carrinho.",
      false,
    );
    return;
  }

  try {
    const r = await fetch("/api/carrinho", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cliente_id: clienteId,
        produto_id: produtoId,
        quantidade,
      }),
    });
    const dados = await r.json();
    mostrar(msgCarrinho, dados.mensagem, r.ok);
    if (r.ok) {
      document.getElementById("quantidade-carrinho").value = 1;
      await carregarCarrinho();
    }
  } catch {
    mostrar(
      msgCarrinho,
      "Não foi possível adicionar o produto ao carrinho.",
      false,
    );
  }
}

async function removerItem(evento) {
  const id = evento.currentTarget.dataset.id;
  try {
    const r = await fetch(`/api/carrinho/${id}`, { method: "DELETE" });
    const dados = await r.json();
    mostrar(msgCarrinho, dados.mensagem, r.ok);
    if (r.ok) await carregarCarrinho();
  } catch {
    mostrar(msgCarrinho, "Não foi possível remover o item do carrinho.", false);
  }
}

formProduto.addEventListener("submit", cadastrarProduto);
document
  .getElementById("botao-atualizar")
  .addEventListener("click", carregarProdutos);
formCliente.addEventListener("submit", cadastrarCliente);
formCarrinho.addEventListener("submit", addNoCarrinho);
cliente.addEventListener("change", carregarCarrinho);
carregarCategorias();
carregarProdutos();
carregarClientes();
carregarCarrinho();

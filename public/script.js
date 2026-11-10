
const socket = io();
let jogadoresPartida = [];
let posicoesPartida = {};
let turnoAtual = null;
let dinheiroPartida = {};

function jogarOnline() {
    alert("O modo JOGAR ONLINE estará disponível em breve!");
}

function jogarComAmigo() {
    window.location.href = "salas.html";
}

function abrirMercado() {
    alert("O MERCADO DE PILOTOS estará disponível em breve!");
}

function abrirCampeonato() {
    alert("O modo CAMPEONATOS estará disponível em breve!");
}

// MOSTRAR A SALA DE ESPERA
function mostrarSala(codigo) {
    document.getElementById("menuSala").hidden = true;
    document.getElementById("salaEspera").hidden = false;
    document.getElementById("codigoExibido").innerText = codigo;
}

// CRIAR SALA
function criarSala() {
    socket.emit("criar-sala");
}

socket.on("sala-criada", (codigo) => {
    mostrarSala(codigo);
});

// ENTRAR EM UMA SALA
function entrarSala() {
    const codigo = document.getElementById("codigoSala").value.trim();

    if (codigo === "") {
        document.getElementById("mensagem").innerText =
            "Digite o código da sala!";
        return;
    }

    socket.emit("entrar-sala", codigo);
}

socket.on("entrou-sala", (codigo) => {
    mostrarSala(codigo);
});

// ATUALIZAR LISTA DE JOGADORES
socket.on("atualizar-sala", (dados) => {
    const lista = document.getElementById("listaJogadores");
    const status = document.getElementById("statusSala");
    const botao = document.getElementById("botaoIniciar");

    if (!lista) return;

    lista.innerHTML = "";

    dados.jogadores.forEach((jogador) => {
        const item = document.createElement("p");

        item.innerText = jogador.nome +
            (jogador.anfitriao ? " — ANFITRIÃO" : "");

        lista.appendChild(item);
    });

    status.innerText =
        dados.quantidade + "/2 jogadores na sala";

    botao.disabled =
        socket.id !== dados.anfitriao ||
        dados.quantidade < 2;
});

// INICIAR PARTIDA
function iniciarPartida() {
    socket.emit("iniciar-partida");
}

socket.on("partida-iniciada", (dados) => {
    document.getElementById("menuSala").hidden = true;
    document.getElementById("salaEspera").hidden = true;
    document.getElementById("telaPartida").hidden = false;

    jogadoresPartida = dados.jogadores;
    posicoesPartida = dados.posicoes;
    dinheiroPartida = dados.dinheiro;
    turnoAtual = dados.turno;

    atualizarTabuleiro();
    atualizarDinheiro();

    document.getElementById("statusPartida").innerText =
        "A partida começou!";
});

// MOSTRAR ERROS
socket.on("erro-sala", (mensagem) => {
    const mensagemElemento = document.getElementById("mensagem");

    if (mensagemElemento) {
        mensagemElemento.innerText = mensagem;
    } else {
        alert(mensagem);
    }
});

// VOLTAR AO MENU
function voltarMenu() {
    window.location.href = "index.html";
}

// ATUALIZAR POSIÇÕES DOS PEÕES
function atualizarTabuleiro() {
    const casas = document.querySelectorAll(".casa");

    casas.forEach(casa => {
        casa.innerHTML = "";
    });

    jogadoresPartida.forEach((jogador, indice) => {
        const posicao = posicoesPartida[jogador];
        const casa = casas[posicao - 1];

        if (!casa) return;

        const peao = document.createElement("span");

        peao.classList.add("peao");
        peao.classList.add(
            indice === 0 ? "peao-vermelho" : "peao-azul"
        );

        peao.innerText = indice === 0 ? "J1" : "J2";

        casa.appendChild(peao);
    });

    document.getElementById("botaoDado").disabled =
        turnoAtual !== socket.id;

    document.getElementById("statusPartida").innerText =
        turnoAtual === socket.id
        ? "É SUA VEZ DE JOGAR!"
        : "Aguardando o adversário...";
}

// LANÇAR O DADO
function lancarDado() {
    const dado = document.getElementById("dadoVisual");
    const botao = document.getElementById("botaoDado");

    botao.disabled = true;

    dado.classList.remove("animando-dado");

    void dado.offsetWidth;

    dado.classList.add("animando-dado");

    socket.emit("lancar-dado");
}

// RECEBER MOVIMENTAÇÃO
socket.on("movimento-atualizado", (dados) => {
    posicoesPartida = dados.posicoes;
    turnoAtual = dados.turno;

    atualizarTabuleiro();

    const facesDado = {
    1: "⚀",
    2: "⚁",
    3: "⚂",
    4: "⚃",
    5: "⚄",
    6: "⚅"
};

document.getElementById("dadoVisual").innerText =
    facesDado[dados.dado];

document.getElementById("resultadoDado").innerText =
    "Você tirou " + dados.dado + " no dado!";

   
});

function atualizarDinheiro() {
    document.getElementById("dinheiroJ1").innerText =
        "$" + dinheiroPartida[jogadoresPartida[0]] + "m";

    document.getElementById("dinheiroJ2").innerText =
        "$" + dinheiroPartida[jogadoresPartida[1]] + "m";
}
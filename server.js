
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const salas = {};

function atualizarSala(codigo) {
    io.to(codigo).emit("atualizar-sala", salas[codigo]);
}

// CONEXÃO
io.on("connection", (socket) => {

    // CRIAR SALA
    socket.on("criar-sala", (codigo) => {

        if (salas[codigo]) {
            socket.emit("erro-sala", "Essa sala já existe!");
            return;
        }

        salas[codigo] = {
            jogadores: [socket.id],
            anfitriao: socket.id,

            posicoes: {
                [socket.id]: 1
            },

            dinheiro: {
                [socket.id]: 20
            },

            turno: socket.id,
            partidaIniciada: false
        };

        socket.join(codigo);
        socket.data.sala = codigo;

        atualizarSala(codigo);
    });

    // ENTRAR NA SALA
    socket.on("entrar-sala", (codigo) => {

        const sala = salas[codigo];

        if (!sala) {
            socket.emit("erro-sala", "Sala não encontrada!");
            return;
        }

        if (sala.jogadores.length >= 2) {
            socket.emit("erro-sala", "Sala cheia!");
            return;
        }

        if (sala.partidaIniciada) {
            socket.emit("erro-sala", "A partida já começou!");
            return;
        }

        sala.jogadores.push(socket.id);

        sala.posicoes[socket.id] = 1;
        sala.dinheiro[socket.id] = 20;

        socket.join(codigo);
        socket.data.sala = codigo;

        atualizarSala(codigo);
    });

    // INICIAR PARTIDA
    socket.on("iniciar-partida", () => {

        const codigo = socket.data.sala;
        const sala = salas[codigo];

        if (!sala) return;

        if (sala.anfitriao !== socket.id) {
            socket.emit("erro-sala", "Somente o anfitrião pode iniciar!");
            return;
        }

        if (sala.jogadores.length !== 2) {
            socket.emit("erro-sala", "São necessários dois jogadores!");
            return;
        }

        sala.partidaIniciada = true;
        sala.turno = sala.jogadores[0];

        io.to(codigo).emit("partida-iniciada", {
            jogadores: sala.jogadores,
            posicoes: sala.posicoes,
            dinheiro: sala.dinheiro,
            turno: sala.turno
        });
    });

    // LANÇAR DADO
    socket.on("lancar-dado", () => {

        const codigo = socket.data.sala;
        const sala = salas[codigo];

        if (!sala || !sala.partidaIniciada) return;

        if (sala.turno !== socket.id) {
            socket.emit("erro-sala", "Não é sua vez!");
            return;
        }

        const dado = Math.floor(Math.random() * 6) + 1;

        // MOVIMENTAÇÃO EM CICLO
        sala.posicoes[socket.id] =
            ((sala.posicoes[socket.id] - 1 + dado) % 16) + 1;

        // PASSAR A VEZ
        const indice = sala.jogadores.indexOf(socket.id);

        sala.turno = sala.jogadores[(indice + 1) % 2];

        const vencedor = null;

        // RECOMPENSAS E DESPESAS
        const recompensas = {
            1: 20,
            2: 10,
            5: 15,
            6: -10,
            8: 20,
            9: 20,
            12: -15,
            13: 15,
            14: 10,
            16: 25
        };

        // APLICAR SOMENTE NA CASA FINAL
        const casaFinal = sala.posicoes[socket.id];

        if (recompensas[casaFinal] !== undefined) {
            sala.dinheiro[socket.id] += recompensas[casaFinal];
        }

        // ATUALIZAR OS DOIS JOGADORES
        io.to(codigo).emit("movimento-atualizado", {
            dado: dado,
            posicoes: sala.posicoes,
            dinheiro: sala.dinheiro,
            turno: sala.turno,
            vencedor: vencedor
        });
    });

    // DESCONECTAR
    socket.on("disconnect", () => {

        const codigo = socket.data.sala;

        if (!codigo || !salas[codigo]) return;

        const sala = salas[codigo];

        sala.jogadores = sala.jogadores.filter(
            id => id !== socket.id
        );

        delete sala.posicoes[socket.id];
        delete sala.dinheiro[socket.id];

        if (sala.jogadores.length === 0) {
            delete salas[codigo];
        } else {
            sala.anfitriao = sala.jogadores[0];
            sala.turno = sala.jogadores[0];
            sala.partidaIniciada = false;

            atualizarSala(codigo);
        }
    });

});

// INICIAR SERVIDOR
const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Rivais do PitLane rodando na porta ${PORT}`);
});

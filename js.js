let dadosAntigos = {};
let dadosNovos = {};

let totalAumento = 0;
let totalReducao = 0;
let qtdAumento = 0;
let qtdReducao = 0;


// ===============================
function lerArquivo(file, callback) {
    const reader = new FileReader();
    reader.onload = e => callback(e.target.result);
    reader.readAsText(file);
}


// ===============================
function dinheiroBR(valor) {
    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}


// ===============================
// SONS
// ===============================
function tocarSomOk() {
    const som = document.getElementById("somOk");
    if (som) {
        som.currentTime = 0;
        som.play();
    }
}

function tocarSomErro() {
    const som = document.getElementById("somErro");
    if (som) {
        som.currentTime = 0;
        som.play();
    }
}


// ===============================
// ALERTA
// ===============================
function mostrarAlerta(mensagem, tipo = "erro") {

    const alerta = document.getElementById("alerta");

    // evita bug se clicar várias vezes
    if (alerta.timer) {
        clearTimeout(alerta.timer);
    }

    alerta.textContent = mensagem;

    alerta.classList.remove("erro", "sucesso", "mostrar");
    alerta.classList.add(tipo, "mostrar");

    if (tipo === "sucesso") {
        tocarSomOk();
    } else {
        tocarSomErro();
    }

    alerta.timer = setTimeout(() => {
        alerta.classList.remove("mostrar");
    }, 3000);
}


// ===============================
// EXTRAÇÃO DEFINITIVA
// NCE = primeiro número com 5+ dígitos
// ===============================
function extrairDados(texto) {
    const linhas = texto.split("\n");
    const produtos = {};

    linhas.forEach(linha => {

        linha = linha.trim();
        if (!linha) return;

        // preço
        const precoMatch = linha.match(/([\d.,]+)\s*$/);
        if (!precoMatch) return;

        let precoTexto = precoMatch[1].replace(/,/g, "");
        const preco = parseFloat(precoTexto);
        if (isNaN(preco)) return;

        linha = linha.replace(/([\d.,]+)\s*$/, "").trim();

        if (linha.startsWith("*")) {
            linha = linha.substring(1).trim();
        }

        const numeros = linha.match(/\d+/g);
        if (!numeros) return;

        const nce = numeros.find(n => n.length >= 5);
        if (!nce) return;

        const pos = linha.indexOf(nce);

        let descricaoCompleta = linha.substring(pos + nce.length).trim();

        // quebrar em partes
        const partes = descricaoCompleta.split(" ");

        let saldo = "";

        // procura número com 2 casas decimais (ex: 2.00)
        const saldoMatch = descricaoCompleta.match(/\b\d+\.\d{2}\b/);

        if (saldoMatch) {
            saldo = saldoMatch[0];

            // remove saldo da descrição
            descricaoCompleta = descricaoCompleta.replace(saldo, "").trim();
        }

        // remove peso (número com 5 casas geralmente)
        descricaoCompleta = descricaoCompleta.replace(/\b\d+\.\d{5}\b/, "").trim();

        const descricao = descricaoCompleta;

        produtos[nce] = {
            nce,
            descricao,
            saldo,
            preco
        };
    });

    return produtos;
}


// ===============================
function comparar() {
    const oldFile = document.getElementById("oldFile").files[0];
    const newFile = document.getElementById("newFile").files[0];

    if (!oldFile || !newFile) {
        mostrarAlerta("Selecione os dois arquivos!");
        return;
    }

    lerArquivo(oldFile, textoAntigo => {
        dadosAntigos = extrairDados(textoAntigo);

        lerArquivo(newFile, textoNovo => {
            dadosNovos = extrairDados(textoNovo);
            mostrarResultado();
        });
    });
}


function filtrarTabela() {
    const termo = document.getElementById("busca").value.toLowerCase();

    const linhas = document.querySelectorAll("#resultado tbody tr");

    linhas.forEach(tr => {
        const texto = tr.innerText.toLowerCase();

        if (texto.includes(termo)) {
            tr.style.display = "";
        } else {
            tr.style.display = "none";
        }
    });
}


// ===============================
function mostrarResultado() {
    totalAumento = 0;
    totalReducao = 0;
    qtdAumento = 0;
    qtdReducao = 0;

    const tbody = document.querySelector("#resultado tbody");
    tbody.innerHTML = "";

    const lista = Object.values(dadosNovos);
    lista.sort((a, b) => a.descricao.localeCompare(b.descricao, "pt-BR"));

    lista.forEach(produto => {

        const nce = produto.nce;

        // ===============================
        // EXISTE NO ARQUIVO ANTIGO
        // ===============================
        if (dadosAntigos[nce]) {

            const antigo = dadosAntigos[nce].preco;
            const novo = produto.preco;

            // SE FOR IGUAL → IGNORA
            if (antigo === novo) {
                return;
            }

            // SE MUDOU → MOSTRA DIFERENÇA
            const diferenca = novo - antigo;

            const valorFormatado = Math.abs(diferenca).toLocaleString("pt-BR", {
                minimumFractionDigits: 2
            });

            const diferencaTexto = diferenca > 0
                ? `R$ +${valorFormatado}`
                : `R$ -${valorFormatado}`;

            if (diferenca > 0) {
                qtdAumento++;
                totalAumento += diferenca;
            } else {
                qtdReducao++;
                totalReducao += diferenca;
            }

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${nce}</td>
                <td>${produto.descricao}</td>
                <td>${produto.saldo}</td>
                <td>${dinheiroBR(antigo)}</td>
                <td>${dinheiroBR(novo)}</td>
                <td class="${diferenca > 0 ? 'aumento' : 'reducao'}">
                    ${diferencaTexto}
                </td>
            `;

            tbody.appendChild(tr);
        }

        // ===============================
        // NÃO EXISTIA → É NOVO
        // ===============================
        else {

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${nce}</td>
                <td>${produto.descricao}</td>
                <td>${produto.saldo}</td>
                <td style="color:blue;font-weight:bold;">NOVO</td>
                <td>${dinheiroBR(produto.preco)}</td>
                <td>-</td>
            `;

            tbody.appendChild(tr);
        }
    });

    document.getElementById("resumo").innerHTML = `
    <b>Produtos alterados:</b> ${qtdAumento + qtdReducao} |
    <b>Aumentos:</b> ${qtdAumento} |
    <b>Reduções:</b> ${qtdReducao}
`;

    mostrarAlerta("Comparação finalizada com sucesso!", "sucesso");
}


// ===============================
// FUNÇÃO LIMPAR ARQUIVOS TXT
// ===============================
function limparTudo() {

    // limpa arquivos
    document.getElementById("oldFile").value = "";
    document.getElementById("newFile").value = "";

    // limpa tabela
    document.querySelector("#resultado tbody").innerHTML = "";

    // limpa resumo
    document.getElementById("resumo").innerHTML = "";

    // limpa busca
    const busca = document.getElementById("busca");
    if (busca) busca.value = "";

    // limpa memória
    dadosAntigos = {};
    dadosNovos = {};

    totalAumento = 0;
    totalReducao = 0;
    qtdAumento = 0;
    qtdReducao = 0;

    mostrarAlerta("Sistema limpo com sucesso!", "sucesso");
}


// ===============================
// PDF IGUAL HTML + DATA/HORA
// ===============================
function gerarPDF() {
    const linhas = document.querySelectorAll("#resultado tbody tr");

if (linhas.length === 0) {
    mostrarAlerta("Faça a comparação antes de gerar o PDF!", "erro");
    return;
}
    const {
        jsPDF
    } = window.jspdf;
    const doc = new jsPDF("p",
        "mm",
        "a4");

    doc.setFontSize(16);
    doc.text("Relatório de Alterações de Preço",
        14,
        15);

    const agora = new Date().toLocaleString("pt-BR");
    doc.setFontSize(10);
    doc.text("Impresso em: " + agora,
        14,
        22);

    let yResumo = 30;

    doc.setFontSize(11);
    doc.text(`Produtos alterados: ${qtdAumento + qtdReducao}`,
        14,
        yResumo);
    yResumo += 6;

    doc.text(`Aumentos: ${qtdAumento}`,
        14,
        yResumo);
    yResumo += 6;

    doc.text(`Reduções: ${qtdReducao}`,
        14,
        yResumo);
    yResumo += 6;


    doc.autoTable({
        html: "#resultado",
        startY: 65,

        styles: {
            fontSize: 7,
            cellPadding: 2,
            overflow: "linebreak",

            // BORDAS
            lineWidth: 0.2,
            // espessura
            lineColor: [0,
                0,
                0] // preto
        },

        columnStyles: {
            3: {
                cellWidth: 25
            },
            4: {
                cellWidth: 22
            },
            5: {
                cellWidth: 22
            }
        },

        didParseCell: function (data) {

            if (data.section === "body" && data.column.index === 5) {

                const valor = String(data.cell.raw || "").trim();

                if (valor.includes("+")) {
                    data.cell.styles.textColor = [200,
                        0,
                        0];
                    data.cell.styles.fontStyle = "bold";
                }

                if (valor.includes("-")) {
                    data.cell.styles.textColor = [0,
                        150,
                        0];
                    data.cell.styles.fontStyle = "bold";
                }
            }
        }
    });

    doc.save("alteracoes_preco.pdf");
                   }

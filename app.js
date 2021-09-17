const axios = require("axios");
const cheerio = require("cheerio");
const express = require("express");
const path = require("path");
const csv = require("csv-parser");
const hbs = require("express-handlebars");
const fs = require("fs");
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

//express
const app = express();
const port = 3000;
app.use(express.static(__dirname + "/public"));

//handlebars
var hbshelper = hbs.create({
  helpers: {
    if: function (v1, v2, options) {
      if (v1 <= v2) {
        return options.fn(this);
      } else {
        return options.inverse(this);
      }
    },
    ifString: function (v1, v2, options) {
      if (v1 == v2) {
        return options.fn(this);
      } else {
        return options.inverse(this);
      }
    },
  },
});

app.engine("handlebars", hbshelper.engine);
app.set("view engine", "handlebars");

let dados = [];
let tabela = [];
let tabelaDetalhes = [];

fs.createReadStream("Impressoras.csv")
  .pipe(csv())
  .on("data", (data) => dados.push(data));

function limpar(valor) {
  valor = valor.trim();
  valor = valor.replace(",", "");
  valor = valor.replace(";", "");
  valor = valor.replace("'", "");
  valor = valor.replace('"', "");
  valor = valor.replace("<", "");
  valor = valor.replace(">", "");
  valor = valor.replace("%", "");
  valor = valor.replace("*", "");
  return valor;
}

function pushTabela(fila, ip, modelo, toner, kitDeManutencao, unidadeDeImagem, marca, status) {
  tabela.push({
    Fila: fila,
    IP: ip,
    Modelo: modelo,
    Toner: toner,
    KitDeManutencao: kitDeManutencao,
    UnidadeDeImagem: unidadeDeImagem,
    Marca: marca,
    Status: status,
  });
}

function pushTabelaDetalhes(fila, ip, modelo, serial, toner, kitDeManutencao, unidadeDeImagem, totalDeImpressoes) {
  tabelaDetalhes.push({
    Fila: fila,
    IP: ip,
    Modelo: modelo,
    Serial: serial,
    Toner: toner,
    KitDeManutencao: kitDeManutencao,
    UnidadeDeImagem: unidadeDeImagem,
    TotalDeImpressoes: totalDeImpressoes,
  });
}

async function recuperaInformacoes() {
  tabela = []; //Limpa dados anteriores

  //Verifica se existe mas não consegue pegar os dados

  function filtrar(indice1, indice2, dados) {
    let filtro = dados.substring(dados.search(indice1), dados.search(indice2));
    let indice = filtro.search("remaining");
    let valor = filtro.substring(indice + 10, indice + 14);
    valor = limpar(valor);
    return valor;
  }

  function filtrarModelo(indice1, indice2, dados) {
    let filtro = dados.substring(dados.search(indice1), dados.search(indice2));
    let indice3 = filtro.search('"');
    let indice4 = filtro.search(",");
    let valor = filtro.substring(indice3 + 1, indice4 - 1);
    valor = limpar(valor);
    return valor;
  }

  function filtrar6555(indice1, indice2, dados) {
    let filtro = dados.substring(dados.search(indice1), dados.search(indice2));
    let indice = filtro.search("=");
    let valor = filtro.substring(indice + 2, indice + 5);

    valor = limpar(valor);
    return valor;
  }

  function filtrarM5360RX(indice1, indice2, dados) {
    let filtro = dados.substring(dados.search(indice1), dados.search(indice2));
    let indice = filtro.search("remaining");
    let valor = filtro.substring(indice + 10, indice + 15);

    valor = limpar(valor);

    let i = valor.search("'");
    if (i == 2) {
      valor = valor.substring(0, valor.length - 1);
    }

    return valor;
  }

  dados.forEach(async (dado) => {
    //Para verificação se existe mas não tem dados a exibir
    let Toner = "";

    //string de conexão
    let url = "http://" + dado.IP;
    let testeConexao = url;
    let urlHP = url + "/hp/device/DeviceStatus/Index";
    let urlSamsung = url + "/sws/app/information/home/home.json";
    let urlSamsung6555 = url + "/Information/supplies_status.htm";
    let urlSamsungM5360RX = url + "/sws.application/home/homeDeviceInfo.sws";

    //Limpa resposta para a próxima requisição
    let responseTeste = "";
    let responseSamsung = "";
    let responseSamsung6555 = "";
    let responseSamsungM5360RX = "";
    let responseHP = "";

    //Verifica se está offline
    responseTeste = axios(testeConexao, { timeout: 7000 })
      .then((data) => {})
      .catch((error) => {
        pushTabela(dado.Fila, dado.IP, "", "", "", "", "", "Offline");
      });

    //Maioria dos modelos Samsung
    responseSamsung = await axios(urlSamsung)
      .then((response) => {
        let UnidadeDeImagem = filtrar("drum_black", "drum_cyan", response.data);
        Toner = filtrar("toner_black", "toner_cyan", response.data);
        let Modelo = filtrarModelo("model_name", "host_name", response.data);

        if (Modelo == "SL-M4020ND" || Modelo == "Samsung CLX-6260 Series") {
          UnidadeDeImagem = "-";
        }

        if (Modelo) {
          pushTabela(dado.Fila, dado.IP, Modelo, Toner, "-", UnidadeDeImagem, "Samsung", "Online");
        }
      })
      .catch((error) => {});

    //Todas as HPs
    responseHP = await axios(urlHP)
      .then((response) => {
        let $ = cheerio.load(response.data);
        Toner = $("#SupplyPLR0").text();
        let KitDeManutencao = $("#SupplyPLR1").text();
        let Modelo = $("#HomeDeviceName").text();

        if (Toner) {
          Toner = limpar(Toner);
        }

        if (KitDeManutencao) {
          KitDeManutencao = limpar(KitDeManutencao);
        }

        if (KitDeManutencao == "") {
          KitDeManutencao = "-";
        }

        if (Modelo) {
          pushTabela(dado.Fila, dado.IP, Modelo, Toner, KitDeManutencao, "-", "HP", "Online");
        }
      })
      .catch((error) => {});

    //Samsung 6555 (Multifuncional)
    responseSamsung6555 = await axios(urlSamsung6555)
      .then((response) => {
        Toner = filtrar6555("BlackTonerPer", "drumInstalled", response.data);
        let UnidadeDeImagem = filtrar6555("BlackDrumPer", "ImageTranserBeltPer", response.data);
        let Modelo = "SCX-6x55X Series";

        if (Toner || UnidadeDeImagem) {
          pushTabela(dado.Fila, dado.IP, Modelo, Toner, "-", UnidadeDeImagem, "Samsung", "Online");
        }
      })
      .catch((error) => {});

    //Samsung M5360RX
    responseSamsungM5360RX = await axios(urlSamsungM5360RX)
      .then((response) => {
        if (response.data == "") {
          //Retorna vazio - usado para não sobrepor a 6555
          throw Error;
        }
        Toner = filtrarM5360RX("tonerData", "loadTonerData", response.data);
        let UnidadeDeImagem = filtrarM5360RX("imagineData", "loadImagineData", response.data);
        let Modelo = "Samsung M5360RX";

        if (Toner || UnidadeDeImagem) {
          pushTabela(dado.Fila, dado.IP, Modelo, Toner, "-", UnidadeDeImagem, "Samsung", "Online");
        }
      })
      .catch((error) => {});

    if (Toner === "") {
      pushTabela(dado.Fila, dado.IP, "-", "-", "-", "-", "-", "Online");
    }
  }); //dados.foreach
}

async function recuperaDetalhes(ip, fila, modelo, toner, marca, kitDeManutencao, unidadeDeImagem) {
  tabelaDetalhes = []; //Limpa dados anteriores
  let Serial = "";
  let TotalDeImpressoes = "";

  //HP
  if (marca == "HP") {
    let urlHP = "http://" + ip + "/hp/device/InternalPages/Index?id=UsagePage";
    await axios(urlHP)
      .then((response) => {
        let $ = cheerio.load(response.data);
        Serial = $("#UsagePage\\.DeviceInformation\\.DeviceSerialNumber").text();
        TotalDeImpressoes = $("#UsagePage\\.EquivalentImpressionsTable\\.Total\\.Total").text();

        if (modelo == "HP LaserJet E50145") {
          TotalDeImpressoes = $("#UsagePage\\.EquivalentImpressionsTable\\.Print\\.Total").text();
        }

        if (TotalDeImpressoes) {
          TotalDeImpressoes = TotalDeImpressoes.substring(0, TotalDeImpressoes.length - 2);
          TotalDeImpressoes = TotalDeImpressoes.replace(",", ".");
        }

        if (kitDeManutencao == "") {
          kitDeManutencao = "-";
        }

        if (Serial || TotalDeImpressoes) {
          pushTabelaDetalhes(fila, ip, modelo, Serial, toner, kitDeManutencao, "-", TotalDeImpressoes);
        }
      })
      .catch((err) => {});
  }

  //SAMSUNG
  if (marca == "Samsung") {
    function filtrarSerial(indice1, dados) {
      let indice = dados.search(indice1);
      let valor = dados.substring(indice + 21, indice + 36).trim();
      return valor;
    }

    function filtrarTotalDeImpressoes(indice1, indice2, dados) {
      let filtro = dados.substring(dados.search(indice1), dados.search(indice2)).trim();
      let indice = filtro.search(":");
      let valor = filtro.substring(indice + 2, filtro.length - 1).trim();
      return valor;
    }

    let urlSamsung = "http://" + ip + "/sws/app/information/counters/counters.json";
    // let urlSamsung6555 = "http://" + ip + "/Information/billing_counters.htm";

    //Limpa dados anteriores
    let responseSamsung = "";
    // let responseSamsung6555 = "";

    responseSamsung = await axios(urlSamsung)
      .then((response) => {
        Serial = filtrarSerial("GXI_SYS_SERIAL_NUM", response.data);
        TotalDeImpressoes = filtrarTotalDeImpressoes("GXI_BILLING_TOTAL_IMP_CNT", "GXI_LARGE_BILLING_CNT_SUPPORT", response.data);

        if (Serial) {
          Serial = limpar(Serial);
        }

        if (Serial || TotalDeImpressoes) {
          pushTabelaDetalhes(fila, ip, modelo, Serial, toner, "-", unidadeDeImagem, TotalDeImpressoes);
        }
      })
      .catch((error) => {});

    // responseSamsung6555 = await axios(urlSamsung6555)
    //   .then((response) => {
    //     let $ = cheerio.load(response.data);
    //     let Serial = $(".allNormalTable", $(".valueFont")).text();
    //     let TotalDeImpressoes = "";

    //     if (Serial || TotalDeImpressoes) {
    //       pushTabelaDetalhes(fila, ip, modelo, Serial, toner, "-", unidadeDeImagem, TotalDeImpressoes);
    //     }
    //   })
    //   .catch((error) => {});
  }

  //Se não encontrar serial ou total de impressões sobe somente as informações que possui
  if (Serial === "" || TotalDeImpressoes === "") {
    pushTabelaDetalhes(fila, ip, modelo, "-", toner, kitDeManutencao, unidadeDeImagem, "-");
  }
}

//Rotas

app.get("/", async (req, res) => {
  console.log("Buscando dados ...");
  await recuperaInformacoes();
  res.render("home");
});

app.get("/info", (req, res) => {
  res.render("info", { tabela: tabela });
});

app.get("/detalhes", async (req, res) => {
  await recuperaDetalhes(req.query.ip, req.query.fila, req.query.modelo, req.query.toner, req.query.marca, req.query.kitDeManutencao, req.query.unidadeDeImagem);
  res.render("detalhes", { tabelaDetalhes: tabelaDetalhes });
});

app.listen(port, () => {});

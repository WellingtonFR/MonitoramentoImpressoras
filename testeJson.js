const axios = require("axios");
const { json } = require("express");
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

let jsonString = {
  status: {
    hrDeviceStatus: 2,
    status1: "Pronto ",
    status2: "Botão Info: ",
    status3: "▤ Menu, ∠ Volt ",
    status4: "▽ Cancel. ",
  },
  identity: {
    model_name: "Samsung ML-451x 501x Series",
    host_name: "IMP_094",
    location: "Magazine Luiza - CD 94",
    serial_num: "Z5NQBAIB900036L",
    ip_addr: "10.50.242.19",
    ipv6_link_addr: "",
    mac_addr: "00:15:99:8F:77:25",
    admin_email: "",
    admin_name: "",
    admin_phone: "",
  },

  toner_black: {
    opt: 1,
    status: 4294967295,
    remaining: 36,
    cnt: 32418,
    newError: "",
  },
  toner_cyan: {
    opt: 0,
    status: 0,
    remaining: 0,
    cnt: 0,
    newError: "",
  },
  toner_magenta: {
    opt: 0,
    status: 0,
    remaining: 0,
    cnt: 0,
    newError: "",
  },
  toner_yellow: {
    opt: 0,
    status: 0,
    remaining: 0,
    cnt: 0,
    newError: "",
  },

  drum_black: {
    opt: 1,
    status: 4294967295,
    remaining: 49,
    newError: "",
  },
  drum_cyan: {
    opt: 0,
    status: 0,
    remaining: 0,
    newError: "",
  },
  drum_magenta: {
    opt: 0,
    status: 0,
    remaining: 0,
    newError: "",
  },
  drum_yellow: {
    opt: 0,
    status: 0,
    remaining: 0,
    newError: "",
  },

  tray1: {
    opt: 1,
    paper_size1: 4,
    paper_size2: 0,
    paper_type: 2,
    capa: 520,
    status: 2,
  },
  tray2: {
    opt: 2,
    paper_size1: 4,
    paper_size2: 0,
    paper_type: 2,
    capa: 520,
    status: 0,
  },
  tray3: {
    opt: 2,
    paper_size1: 4,
    paper_size2: 0,
    paper_type: 2,
    capa: 520,
    status: 0,
  },
  tray4: {
    opt: 2,
    paper_size1: 4,
    paper_size2: 0,
    paper_type: 2,
    capa: 520,
    status: 0,
  },
  tray5: {
    opt: 2,
    paper_size1: 4,
    paper_size2: 0,
    paper_type: 2,
    capa: 520,
    status: 0,
  },
  mp: {
    opt: 1,
    paper_size1: 4,
    paper_size2: 0,
    paper_type1: 2,
    paper_type2: 0,
    capa: 100,
    status: 1,
  },
  GXI_INSTALL_OPTION_MULTIBIN: 0,
  outbin: [["Bin 1", 500, 1]],
  capability: {
    hdd: { opt: 2, capa: 0 },
    ram: { opt: 262144, capa: 262144 },
    scanner: { opt: 0, capa: 0 },
  },

  options: {
    extendedMem: 2,
    hdd: 2,
    wlan: 2,
    finisher: 2,
    mailBox: 2,
  },
  GXI_ACTIVE_ALERT_TOTAL: 0,
  GXI_ADMIN_WUI_HAS_DEFAULT_PASS: 1,
  GXI_SUPPORT_COLOR: 0,
  GXI_STORAGE_TYPE: 0,
};

let urlSamsung = "http://10.50.242.19/sws/app/information/home/home.json";

function filtrar(indice1, indice2, dados) {
  let filtro = dados.substring(dados.search(indice1), dados.search(indice2));
  let indice = filtro.search("remaining");
  let valor = filtro.substring(indice + 10, indice + 13).trim();
  return valor;
}

function filtrarModelo(indice1, indice2, dados) {
  let filtro = dados.substring(dados.search(indice1), dados.search(indice2));
  let indice3 = filtro.search('"');
  let indice4 = filtro.search(",");
  let valor = filtro.substring(indice3 + 1, indice4 - 1).trim();
  return valor;
}

axios(urlSamsung).then((response) => {
  let drum_black = filtrar("drum_black", "drum_cyan", response.data);
  console.log("Unidade de imagem: " + drum_black);
  let toner_black = filtrar("toner_black", "toner_cyan", response.data);
  console.log("Toner: " + toner_black);
  let Modelo = filtrarModelo("model_name", "host_name", response.data);
  console.log("Modelo: " + Modelo);
});

// let stringifyData = JSON.stringify(jsonString);
// let sub = stringifyData.substring(1, stringifyData.length - 1);
// let parseJson = JSON.parse(sub);

// console.log(parseJson);

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

const PORT = 3000;

// =====================================================
// CONFIGURAÇÕES
// =====================================================

const DB_FILE = path.join(__dirname, "db.json");
const FOTOS_DIR = path.join(__dirname, "fotos");

// Criar pasta de fotos caso não exista
if (!fs.existsSync(FOTOS_DIR)) {
  fs.mkdirSync(FOTOS_DIR, { recursive: true });
}

// =====================================================
// MIDDLEWARES
// =====================================================

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir fotos
app.use("/fotos", express.static(FOTOS_DIR));

// Servir arquivos públicos, caso você tenha frontend
app.use(express.static(path.join(__dirname, "public")));

// =====================================================
// MULTER - UPLOAD DE FOTO
// =====================================================

const storage = multer.diskStorage({

  destination: function (req, file, cb) {
    cb(null, FOTOS_DIR);
  },

  filename: function (req, file, cb) {

    const extensao = path.extname(file.originalname);

    const nomeArquivo =
      "paciente-" +
      Date.now() +
      extensao;

    cb(null, nomeArquivo);
  }

});

const upload = multer({
  storage: storage,

  limits: {
    fileSize: 5 * 1024 * 1024
  },

  fileFilter: function (req, file, cb) {

    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg"
    ];

    if (tiposPermitidos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Apenas imagens JPG, PNG ou WEBP são permitidas."));
    }

  }
});

// =====================================================
// FUNÇÕES DO BANCO JSON
// =====================================================

function bancoPadrao() {

  return {
    usuarios: [
      {
        usuario: "triagem",
        senha: "123",
        tipo: "triagem"
      },
      {
        usuario: "medico",
        senha: "123",
        tipo: "medico"
      },
      {
        usuario: "atendimento",
        senha: "123",
        tipo: "atendimento"
      }
    ],

    pacientes: [],

    triagens: [],

    consultas: [],

    tv_chamada: {},

    tv_historico: []
  };

}


// Ler banco
function lerDB() {

  try {

    if (!fs.existsSync(DB_FILE)) {

      const banco = bancoPadrao();

      fs.writeFileSync(
        DB_FILE,
        JSON.stringify(banco, null, 2),
        "utf8"
      );

      return banco;
    }

    const conteudo =
      fs.readFileSync(DB_FILE, "utf8");

    if (!conteudo.trim()) {
      return bancoPadrao();
    }

    const db = JSON.parse(conteudo);

    // Garantir que os arrays existam
    if (!Array.isArray(db.usuarios)) {
      db.usuarios = [];
    }

    if (!Array.isArray(db.pacientes)) {
      db.pacientes = [];
    }

    if (!Array.isArray(db.triagens)) {
      db.triagens = [];
    }

    if (!Array.isArray(db.consultas)) {
      db.consultas = [];
    }

    if (!Array.isArray(db.tv_historico)) {
      db.tv_historico = [];
    }

    if (!db.tv_chamada) {
      db.tv_chamada = {};
    }

    return db;

  } catch (erro) {

    console.error("Erro ao ler db.json:", erro);

    throw erro;
  }

}


// Salvar banco
function salvarDB(db) {

  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(db, null, 2),
    "utf8"
  );

}


// =====================================================
// TESTE DO SERVIDOR
// =====================================================

app.get("/", (req, res) => {

  res.json({
    sucesso: true,
    mensagem: "Servidor funcionando",
    porta: PORT
  });

});


// =====================================================
// LOGIN
// =====================================================

app.post("/login", (req, res) => {

  try {

    const {
      usuario,
      senha
    } = req.body;

    const db = lerDB();

    const encontrado = db.usuarios.find(user =>

      user.usuario === usuario &&
      user.senha === senha

    );

    if (!encontrado) {

      return res.status(401).json({
        sucesso: false,
        mensagem: "Usuário ou senha inválidos"
      });

    }

    res.json({

      sucesso: true,

      usuario: {
        usuario: encontrado.usuario,
        tipo: encontrado.tipo
      }

    });

  } catch (erro) {

    console.error(erro);

    res.status(500).json({
      sucesso: false,
      mensagem: "Erro no login"
    });

  }

});


// =====================================================
// CADASTRAR PACIENTE
// =====================================================

app.post(
  "/atendimento",
  upload.single("foto"),
  (req, res) => {

    try {

      console.log("=================================");
      console.log("NOVO ATENDIMENTO");
      console.log("Dados recebidos:");
      console.log(req.body);

      if (req.file) {
        console.log("Foto recebida:", req.file.filename);
      }

      console.log("=================================");


      const db = lerDB();


      // -------------------------------------------------
      // DOCUMENTO
      // -------------------------------------------------

      const documento =
        req.body.documento ||
        req.body.cpf ||
        "";


      // -------------------------------------------------
      // FOTO
      // -------------------------------------------------

      let foto = "";

      if (req.file) {

        foto =
          "/fotos/" +
          req.file.filename;

      }


      // -------------------------------------------------
      // PACIENTE
      // -------------------------------------------------

      const paciente = {

        id: Date.now(),

        // Identificação
        nome:
          req.body.nome || "",

        // Mantém CPF para compatibilidade
        cpf:
          documento,

        // Novo campo
        documento:
          documento,

        dataNascimento:
          req.body.dataNascimento || "",

        sexo:
          req.body.sexo || "",

        nomeMae:
          req.body.nomeMae || "",

        estadoCivil:
          req.body.estadoCivil || "",

        // Contato
        endereco:
          req.body.endereco || "",

        telefone:
          req.body.telefone || "",

        email:
          req.body.email || "",

        contatoEmergencia:
          req.body.contatoEmergencia || "",

        telefoneEmergencia:
          req.body.telefoneEmergencia || "",

        // Atendimento
        tipo:
          req.body.tipo || "Particular",

        // Foto
        foto:

          foto,

        // Fluxo
        status:
          "triagem",

        // Data
        createdAt:
          new Date().toISOString()

      };


      // -------------------------------------------------
      // SALVAR
      // -------------------------------------------------

      db.pacientes.push(paciente);

      salvarDB(db);


      console.log(
        "Paciente salvo com sucesso:",
        paciente
      );


      // -------------------------------------------------
      // RESPOSTA
      // -------------------------------------------------

      res.status(201).json({

        sucesso: true,

        mensagem:
          "Paciente cadastrado com sucesso",

        paciente:
          paciente

      });


    } catch (erro) {

      console.error(
        "ERRO AO CADASTRAR PACIENTE:",
        erro
      );

      res.status(500).json({

        sucesso: false,

        mensagem:
          "Erro ao salvar paciente",

        erro:
          erro.message

      });

    }

  }
);


// =====================================================
// LISTAR PACIENTES
// =====================================================

app.get("/pacientes", (req, res) => {

  try {

    const db = lerDB();

    res.json(db.pacientes);

  } catch (erro) {

    console.error(erro);

    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao carregar pacientes"
    });

  }

});


// =====================================================
// BUSCAR PACIENTE POR ID
// =====================================================

app.get("/pacientes/:id", (req, res) => {

  try {

    const db = lerDB();

    const id =
      Number(req.params.id);

    const paciente =
      db.pacientes.find(
        p => p.id === id
      );

    if (!paciente) {

      return res.status(404).json({
        sucesso: false,
        mensagem: "Paciente não encontrado"
      });

    }

    res.json(paciente);

  } catch (erro) {

    console.error(erro);

    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao buscar paciente"
    });

  }

});


// =====================================================
// TRIAGEM
// =====================================================

app.post("/triagem", (req, res) => {

  try {

    const db = lerDB();

    const triagem = {

      id: Date.now(),

      ...req.body,

      status:
        "aguardando_medico",

      createdAt:
        new Date().toISOString()

    };

    db.triagens.push(triagem);

    // Atualizar paciente
    if (req.body.pacienteId) {

      const paciente =
        db.pacientes.find(
          p =>
            p.id ===
            Number(req.body.pacienteId)
        );

      if (paciente) {

        paciente.status =
          "aguardando_medico";

      }

    }

    salvarDB(db);

    res.status(201).json({

      sucesso: true,

      mensagem:
        "Triagem cadastrada",

      triagem:
        triagem

    });

  } catch (erro) {

    console.error(erro);

    res.status(500).json({

      sucesso: false,

      mensagem:
        "Erro ao salvar triagem"

    });

  }

});


// =====================================================
// LISTAR TRIAGENS
// =====================================================

app.get("/triagens", (req, res) => {

  try {

    const db = lerDB();

    res.json(db.triagens);

  } catch (erro) {

    console.error(erro);

    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao carregar triagens"
    });

  }

});


// =====================================================
// CONSULTA MÉDICA
// =====================================================

app.post("/consulta", (req, res) => {

  try {

    const db = lerDB();

    const consulta = {

      id: Date.now(),

      paciente:
        req.body.paciente || "",

      pacienteId:
        req.body.pacienteId || "",

      diagnostico:
        req.body.diagnostico || "",

      medicacao:
        req.body.medicacao || "",

      obs:
        req.body.obs || "",

      createdAt:
        new Date().toISOString()

    };


    db.consultas.push(consulta);


    // Atualizar status do paciente
    if (req.body.pacienteId) {

      const paciente =
        db.pacientes.find(
          p =>
            p.id ===
            Number(req.body.pacienteId)
        );

      if (paciente) {

        paciente.status =
          "atendido";

      }

    }


    salvarDB(db);


    res.status(201).json({

      sucesso: true,

      mensagem:
        "Consulta salva",

      consulta:
        consulta

    });

  } catch (erro) {

    console.error(erro);

    res.status(500).json({

      sucesso: false,

      mensagem:
        "Erro ao salvar consulta"

    });

  }

});


// =====================================================
// LISTAR CONSULTAS
// =====================================================

app.get("/consultas", (req, res) => {

  try {

    const db = lerDB();

    res.json(db.consultas);

  } catch (erro) {

    console.error(erro);

    res.status(500).json({

      sucesso: false,

      mensagem:
        "Erro ao carregar consultas"

    });

  }

});


// =====================================================
// TV - CHAMADA
// =====================================================

app.post("/tv/chamar", (req, res) => {

  try {

    const db = lerDB();

    const chamada = {

      id:
        String(Date.now()),

      localTipo:
        req.body.localTipo || "GUICHÊ",

      localNumero:
        req.body.localNumero || "01",

      paciente:
        req.body.paciente || "",

      hora:
        new Date().toLocaleTimeString(
          "pt-BR",
          {
            hour: "2-digit",
            minute: "2-digit"
          }
        )

    };


    db.tv_chamada =
      chamada;


    db.tv_historico.unshift(
      chamada
    );


    // Manter apenas últimas 50 chamadas
    db.tv_historico =
      db.tv_historico.slice(0, 50);


    salvarDB(db);


    res.json({

      sucesso: true,

      chamada:
        chamada

    });

  } catch (erro) {

    console.error(erro);

    res.status(500).json({

      sucesso: false,

      mensagem:
        "Erro ao chamar paciente"

    });

  }

});


// =====================================================
// TV - CHAMADA ATUAL
// =====================================================

app.get("/tv/chamada", (req, res) => {

  try {

    const db = lerDB();

    res.json(
      db.tv_chamada
    );

  } catch (erro) {

    console.error(erro);

    res.status(500).json({

      sucesso: false,

      mensagem:
        "Erro ao carregar chamada"

    });

  }

});


// =====================================================
// TV - HISTÓRICO
// =====================================================

app.get("/tv/historico", (req, res) => {

  try {

    const db = lerDB();

    res.json(
      db.tv_historico
    );

  } catch (erro) {

    console.error(erro);

    res.status(500).json({

      sucesso: false,

      mensagem:
        "Erro ao carregar histórico"

    });

  }

});


// =====================================================
// TRATAMENTO DE ERRO DO MULTER
// =====================================================

app.use(
  (erro, req, res, next) => {

    console.error(
      "ERRO:",
      erro
    );

    if (
      erro instanceof multer.MulterError
    ) {

      return res.status(400).json({

        sucesso: false,

        mensagem:
          "Erro no upload da foto",

        erro:
          erro.message

      });

    }


    if (
      erro.message &&
      erro.message.includes(
        "Apenas imagens"
      )
    ) {

      return res.status(400).json({

        sucesso: false,

        mensagem:
          erro.message

      });

    }


    res.status(500).json({

      sucesso: false,

      mensagem:
        "Erro interno do servidor",

      erro:
        erro.message

    });

  }
);


// =====================================================
// INICIAR SERVIDOR
// =====================================================

app.listen(
  PORT,
  () => {

    console.log("");
    console.log(
      "================================="
    );

    console.log(
      " SERVIDOR INICIADO"
    );

    console.log(
      ` http://localhost:${PORT}`
    );

    console.log(
      "================================="
    );

    console.log(
      "Banco:",
      DB_FILE
    );

    console.log(
      "Fotos:",
      FOTOS_DIR
    );

    console.log("");

  }
);

import BaseModel from './BaseModel.js';

export default class Usuarios extends BaseModel {

    constructor(connection, entidade_negocio = 0) {
        
        const field = {
            id: 0,
            usuario: '',
            nom_completo: '',
            email: '',
            senha: '',
            entidade_negocio: 0,
            id_perfil: 0,
            modo_acesso: '',
            reset_password: 0,
            num_verificacao: null,
            id_vendedor: null,
            id_cobrador: null,
            iniciais: '',
        }
    
        super(connection, 'tb_usuarios', field, entidade_negocio);

    }

    set id(id) {this.field.id = Number(id)}
    get id() {return Number(this.field.id)}

    set usuario(usuario) {this.field.usuario = usuario}
    get usuario() {return this.field.usuario}

    set nom_completo(nom_completo) {this.field.nom_completo = nom_completo}
    get nom_completo() {return this.field.nom_completo}

    set email(email) {this.field.email = email}
    get email() {return this.field.email}

    set senha(senha) {this.field.senha = senha}
    get senha() {return this.field.senha}

    set id_perfil(id_perfil) {this.field.id_perfil = Number(id_perfil)}
    get id_perfil() {return Number(this.field.id_perfil)}

    set modo_acesso(modo_acesso) {this.field.modo_acesso = String(modo_acesso || '').trim().toUpperCase()}
    get modo_acesso() {return this.field.modo_acesso}

    set reset_password(reset_password) {this.field.reset_password = Number(reset_password)}
    get reset_password() {return Number(this.field.reset_password)}

    set iniciais(iniciais) {this.field.iniciais = iniciais}
    get iniciais() {return this.field.iniciais}
    
    set id_vendedor(id_vendedor) {this.field.id_vendedor = id_vendedor}
    get id_vendedor() {return this.field.id_vendedor}
    
    set id_cobrador(id_cobrador) {this.field.id_cobrador = id_cobrador}
    get id_cobrador() {return this.field.id_cobrador}

    set num_verificacao(num_verificacao) {this.field.num_verificacao = num_verificacao}
    get num_verificacao() {return this.field.num_verificacao}

    async FindByUser(usuario) {

        let query = `SELECT * FROM tb_usuarios WHERE usuario = :usuario`;
        
        const [rows] = await this.ExecuteQuery(query,{usuario});

        if (rows) {
            this.field = rows;
            this.found = true;
        } else {
            this.found = false;
        }

        return this.found ? this.field : this.found;

    }
    
}

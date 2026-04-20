export default class Usuarios {

    #conn = null;
    #found = null;
    #tb_name = 'tb_usuarios';
    #entidade_negocio = 0;

    #field = {
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

    constructor(connection, entidade_negocio = 0) {
        
        if (!connection) throw new Error('Conexao Invalida.');

        if (Number(entidade_negocio) > 0) {
            this.#entidade_negocio = Number(entidade_negocio);
        } else {
            throw new Error('Entidade de Negocio não fornecida.');
        }

        this.#field.entidade_negocio = this.#entidade_negocio;

        this.#conn = connection;
    }

    get found() {return this.#found}

    set id(id) {this.#field.id = Number(id)}
    get id() {return Number(this.#field.id)}

    set usuario(usuario) {this.#field.usuario = usuario}
    get usuario() {return this.#field.usuario}

    set nom_completo(nom_completo) {this.#field.nom_completo = nom_completo}
    get nom_completo() {return this.#field.nom_completo}

    set email(email) {this.#field.email = email}
    get email() {return this.#field.email}

    set senha(senha) {this.#field.senha = senha}
    get senha() {return this.#field.senha}

    set id_perfil(id_perfil) {this.#field.id_perfil = Number(id_perfil)}
    get id_perfil() {return Number(this.#field.id_perfil)}

    set modo_acesso(modo_acesso) {this.#field.modo_acesso = String(modo_acesso || '').trim().toUpperCase()}
    get modo_acesso() {return this.#field.modo_acesso}

    set reset_password(reset_password) {this.#field.reset_password = Number(reset_password)}
    get reset_password() {return Number(this.#field.reset_password)}

    set iniciais(iniciais) {this.#field.iniciais = iniciais}
    get iniciais() {return this.#field.iniciais}
    
    set id_vendedor(id_vendedor) {this.#field.id_vendedor = id_vendedor}
    get id_vendedor() {return this.#field.id_vendedor}
    
    set id_cobrador(id_cobrador) {this.#field.id_cobrador = id_cobrador}
    get id_cobrador() {return this.#field.id_cobrador}

    set num_verificacao(num_verificacao) {this.#field.num_verificacao = num_verificacao}
    get num_verificacao() {return this.#field.num_verificacao}

    get entidade_negocio() {return Number(this.#field.entidade_negocio)}

    async ExecuteQuery(query, params = {}) {
        
        const rows = await this.#conn.query(query, params);
        return rows;

    }

    
    async FindByUser(usuario) {

        let query = `SELECT * FROM ${this.#tb_name} WHERE usuario = :usuario`;
        
        const [rows] = await this.#conn.query(query,{usuario});

        if (rows) {
            this.id = rows.id;
            this.usuario = rows.usuario;
            this.nom_completo = rows.nom_completo;
            this.email = rows.email;
            this.senha = rows.senha;
            this.reset_password = rows.reset_password;
            this.iniciais = rows.iniciais;
            this.id_perfil = rows.id_perfil;
            this.modo_acesso = rows.modo_acesso;
            this.num_verificacao = rows.num_verificacao;
            this.id_vendedor = rows.id_vendedor;
            this.id_cobrador = rows.id_cobrador;
            this.#found = true;
        } else {
            this.#found = false;
        }

        return this.#found ? this.#field : this.#found;

    }
    
    async FindById(id) {
            
        let query = `SELECT * FROM ${this.#tb_name} 
                     WHERE entidade_negocio = :entidade_negocio AND id = :id`;
        

        const [rows] = await this.#conn.query(query,({entidade_negocio:this.#entidade_negocio,id}));

        if (rows) {
            this.id = rows.id;
            this.usuario = rows.usuario;
            this.nom_completo = rows.nom_completo;
            this.email = rows.email;
            this.senha = rows.senha;
            this.reset_password = rows.reset_password
            this.iniciais = rows.iniciais;
            this.id_perfil = rows.id_perfil;
            this.modo_acesso = rows.modo_acesso;
            this.num_verificacao = rows.num_verificacao;
            this.id_vendedor = rows.id_vendedor;
            this.id_cobrador = rows.id_cobrador;
            this.#found = true;
        } else {
            this.#found = false;
        }

        return this.#found ? this.#field : this.#found;

    }

    async Save() {
        
        let query;

        if (this.#found) {

            query = `UPDATE tb_usuarios 
                     SET usuario = :usuario,
                     nom_completo = :nom_completo, 
                     email = :email, 
                     senha = :senha,
                     entidade_negocio = :entidade_negocio, 
                     id_perfil = :id_perfil, 
                     modo_acesso = :modo_acesso, 
                     reset_password = :reset_password, 
                     iniciais = :iniciais, 
                     num_verificacao = :num_verificacao,
                     id_vendedor = :id_vendedor,
                     id_cobrador = :id_cobrador
                     WHERE entidade_negocio = :entidade_negocio AND id = :id`;

        } else {

            this.id = await this.#newId();

            query = `INSERT INTO tb_usuarios 
                    SET usuario = :usuario, 
                    nom_completo = :nom_completo, 
                    email = :email, 
                    num_verificacao = :num_verificacao,
                    senha = :senha, 
                    entidade_negocio = :entidade_negocio, 
                    id_perfil = :id_perfil, 
                    modo_acesso = :modo_acesso, 
                    reset_password = :reset_password, 
                    iniciais = :iniciais, 
                    num_verificacao = :num_verificacao,
                    id_vendedor = :id_vendedor,
                    id_cobrador = :id_cobrador,
                    id = :id`
        }

        return await this.#conn.query(query,this.#field);
        
    }

    async Excluir(id) {
        
        const query = `DELETE FROM ${this.#tb_name} 
                       WHERE entidade_negocio= :entidade_negocio AND id = :id`;

        void await this.#conn.query(query,{id,entidade_negocio: this.#field.entidade_negocio});
    
    }

    async #newId() {

        const query =  `SELECT IFNULL(MAX(id),0) + 1 as newid 
                        FROM ${this.#tb_name} 
                        WHERE entidade_negocio = :entidade_negocio`;
                        
        const [rows] = await this.#conn.query(query,{entidade_negocio: this.#field.entidade_negocio});

        return Number(rows.newid);

    }

}

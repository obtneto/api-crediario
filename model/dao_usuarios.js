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
        reset_password: 0,
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
    get id() {return this.#field.id}

    set usuario(usuario) {this.#field.usuario = usuario}
    get usuario() {return this.#field.usuario}

    set nom_completo(nom_completo) {this.#field.nom_completo = nom_completo}
    get nom_completo() {return this.#field.nom_completo}

    set email(email) {this.#field.email = email}
    get email() {return this.#field.email}

    set senha(senha) {this.#field.senha = senha}
    get senha() {return this.#field.senha}

    set id_perfil(id_perfil) {this.#field.id_perfil = Number(id_perfil)}
    get id_perfil() {return this.#field.id_perfil}

    set reset_password(reset_password) {this.#field.reset_password = Number(reset_password)}
    get reset_password() {return this.#field.reset_password}

    set iniciais(iniciais) {this.#field.iniciais = iniciais}
    get iniciais() {return this.#field.iniciais}

    get entidade_negocio() {return this.#field.entidade_negocio}

    async ExecuteQuery(query, params = {}) {
        try {
            const rows = await this.#conn.execute(query, params);
            return rows;
        } catch (error) {
            throw error;
        }

    }

    
    async FindByUser(usuario) {

        try {
            
            let query = `SELECT * FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio AND usuario = :usuario`;
            
            const [rows] = await this.#conn.query(query,{entidade_negocio: this.#entidade_negocio,usuario});

            if (rows) {
                this.#field.id = rows.id;
                this.#field.usuario = rows.usuario;
                this.#field.nom_completo = rows.nom_completo;
                this.#field.email = rows.email;
                this.#field.senha = rows.senha;
                this.#field.reset_password = rows.reset_password
                this.#field.iniciais = rows.iniciais;
                this.#field.id_perfil = rows.id_perfil;
                this.#found = true;
            } else {
                this.#found = false;
            }

            return this.#found ? rows : this.#found;

        } catch (error) {
            throw error;
        }

    }
    
    async FindById(id) {

        try {
            
            let query = `SELECT * FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio AND id = :id`;
            
            console.log(this.#entidade_negocio)

            const [rows] = await this.#conn.query(query,({entidade_negocio:this.#entidade_negocio,id}));

            if (rows) {
                this.#field.id = rows.id;
                this.#field.usuario = rows.usuario;
                this.#field.nom_completo = rows.nom_completo;
                this.#field.email = rows.email;
                this.#field.senha = rows.senha;
                this.#field.reset_password = rows.reset_password
                this.#field.iniciais = rows.iniciais;
                this.#field.id_perfil = rows.id_perfil;
                this.#found = true;
            } else {
                this.#found = false;
            }

            return this.#found ? rows : this.#found;
        } catch (error) {
            throw error;
        }

    }

    async Save() {
        try {
            let query = null;

            if (this.#found) {
                query = `UPDATE tb_usuarios SET usuario = :usuario,nom_completo = :nom_completo, email = :email, 
                senha = :senha, entidade_negocio = :entidade_negocio, id_perfil = :id_perfil, reset_password = :reset_password, 
                iniciais = :iniciais WHERE entidade_negocio = :entidade_negocio AND id = :id`;
            } else {
                this.#field.id = await this.#newId();

                query = `INSERT INTO tb_usuarios SET usuario = :usuario, nom_completo = :nom_completo, email = :email, 
                senha = :senha, entidade_negocio = :entidade_negocio, id_perfil = :id_perfil, reset_password = :reset_password, iniciais = :iniciais, 
                id = :id`
            }

            return await this.#conn.query(query,this.#field);
        } catch (error) {
            throw error;
        }

    }

    async Excluir(id) {
        
        try {
            
            const query = `DELETE FROM ${this.#tb_name} WHERE entidade_negocio= :entidade_negocio AND id = :id`;

            void await this.#conn.query(query,{id,entidade_negocio: this.#field.entidade_negocio});
            
        } catch (error) {
            throw error;
        }
    }

    async #newId() {
        try {
            const query =  `SELECT IFNULL(MAX(id),0) + 1 as newid FROM ${this.#tb_name} WHERE entidade_negocio = :entidade_negocio`;
            const [rows] = await this.#conn.query(query,{entidade_negocio: this.#field.entidade_negocio});

            return rows.newid;
        } catch (error) {
            throw error;
        }

    }

}

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

    set reset_password(reset_password) {this.#field.reset_password = Number(reset_password)}
    get reset_password() {return Number(this.#field.reset_password)}

    set iniciais(iniciais) {this.#field.iniciais = iniciais}
    get iniciais() {return this.#field.iniciais}

    get entidade_negocio() {return Number(this.#field.entidade_negocio)}

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
            
            let query = `SELECT * FROM ${this.#tb_name} WHERE usuario = :usuario`;
            
            const [rows] = await this.#conn.query(query,{usuario});

            if (rows) {
                this.id = Number(rows.id);
                this.usuario = String(rows.usuario);
                this.nom_completo = String(rows.nom_completo);
                this.email = String(rows.email);
                this.senha = String(rows.senha);
                this.reset_password = Number(rows.reset_password)
                this.iniciais = String(rows.iniciais);
                this.id_perfil = Number(rows.id_perfil);
                this.#found = true;
            } else {
                this.#found = false;
            }

            return this.#found ? this.#field : this.#found;

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
                this.id = Number(rows.id);
                this.usuario = String(rows.usuario);
                this.nom_completo = String(rows.nom_completo);
                this.email = String(rows.email);
                this.senha = String(rows.senha);
                this.reset_password = Number(rows.reset_password)
                this.iniciais = String(rows.iniciais);
                this.id_perfil = Number(rows.id_perfil);
                this.#found = true;
            } else {
                this.#found = false;
            }

            return this.#found ? this.#field : this.#found;
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
                this.id = await this.#newId();

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

            return Number(rows.newid);

        } catch (error) {
            throw error;
        }

    }

}

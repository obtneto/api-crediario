export default class TiposPagamentos {

    #conn = null;
    #found = null;
    #tb_name = 'tb_tipos_pagamentos';
    #entidade_negocio = 0;

    #field = {
        id: 0,
        nom_tipo: '',
        ativo: 0,
        entidade_negocio: 0
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

    set id(id) {this.#field.id = id}
    get id() {return this.#field.id}

    set nom_tipo(nom_tipo) {this.#field.nom_tipo = nom_tipo}
    get nom_tipo() {return this.#field.nom_tipo}

    set ativo(ativo) {this.#field.ativo = ativo}
    get ativo() {return this.#field.ativo}

    get entidade_negocio() {return this.#field.entidade_negocio}

    async ExecuteQuery(query) {

        try {

            const rows = await this.#conn.query(query);

            return rows;

        } catch (error) {
            throw error;
        }

    }

    async FindById(id) {

        try {
            
            let query = `SELECT * FROM ${this.#tb_name} 
            WHERE id = :id AND entidade_negocio = :entidade_negocio `;

            const [rows] = await this.#conn.query(query,{id,entidade_negocio: this.#field.entidade_negocio});

            if (rows) {
                
                this.#field.id = rows.id;
                this.#field.nom_tipo = rows.nom_tipo
                this.#field.ativo = rows.ativo;
                
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
                query = `UPDATE ${this.#tb_name} SET nom_tipo = :nom_tipo, ativo = :ativo 
                WHERE id = :id AND entidade_negocio = :entidade_negocio`;
            } else {
                this.#field.id = await this.#newId();
                query = `INSERT INTO ${this.#tb_name} SET id = :id, nom_tipo = :nom_tipo, ativo = :ativo, 
                entidade_negocio = :entidade_negocio`
            }

            return await this.#conn.query(query,this.#field);

        } catch (error) {
            throw error;
        }

    }

    async Excluir(id) {
        
        try {
            
            const query = `DELETE FROM ${this.#tb_name} WHERE id = :id AND entidade_negocio= :entidade_negocio`;

            void  await this.#conn.query(query,{id,entidade_negocio: this.#field.entidade_negocio});
            
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

export default class BaseModel {

    #conn = null;
    #found = null;
    #tb_name = '';
    #entidade_negocio = 0;
    field = {};

    constructor(connection, tb_name, field_structure, entidade_negocio = 0) {
        
        if (!connection) throw new Error('Conexao Invalida.');

        if (Number(entidade_negocio) > 0) {
           this.#entidade_negocio = Number(entidade_negocio);
        } else {
            throw new Error('Entidade de Negocio não fornecida.');
        }

        this.#tb_name = tb_name;
        this.field = { ...field_structure };
        this.field.entidade_negocio = this.#entidade_negocio;
        this.#conn = connection;
    }

    get found() { return this.#found }
    set found(value) { this.#found = value }

    async ExecuteQuery(query, params = {}) {
        const rows = await this.#conn.query(query, params);
        return rows;
    }

    async FindById(id) {
        let query = `SELECT * FROM ${this.#tb_name} 
                     WHERE entidade_negocio = :entidade_negocio AND id = :id`;
        
        const [rows] = await this.#conn.query(query, { id, entidade_negocio: this.#entidade_negocio });

        if (rows) {
            this.#populateFromRow(rows);
            this.#found = true;
        } else {
            this.#found = false;
        }

        return this.#found ? this.field : this.#found;
    }

    async Save() {
        let query;
        const fieldToSave = { ...this.field };

        if (this.#found) {
            query = this.#buildUpdateQuery();
        } else {
            this.field.id = await this.#newId();
            fieldToSave.id = this.field.id;
            query = this.#buildInsertQuery();
        }

        return await this.#conn.query(query, fieldToSave);
    }

    async Excluir() {
        const query = `DELETE FROM ${this.#tb_name} 
                       WHERE entidade_negocio = :entidade_negocio AND id = :id`;

        void await this.#conn.query(query, { id: this.field.id, entidade_negocio: this.field.entidade_negocio });
    }

    async #newId() {
        const query = `SELECT IFNULL(MAX(id), 0) + 1 as newid 
                       FROM ${this.#tb_name} 
                       WHERE entidade_negocio = :entidade_negocio FOR UPDATE`;
                        
        const [rows] = await this.#conn.query(query, { entidade_negocio: this.field.entidade_negocio });

        return Number(rows.newid);
    }

    #populateFromRow(row) {
        Object.keys(this.field).forEach(key => {
            if (row[key] !== undefined) {
                this.field[key] = row[key];
            }
        });
    }

    #buildInsertQuery() {
        const fields = Object.keys(this.field).filter(f => f !== 'entidade_negocio' || this.field[f] !== 0);
        const assignments = fields.map(f => `${f} = :${f}`).join(', ');
        
        return `INSERT INTO ${this.#tb_name} 
                SET ${assignments}`;
    }

    #buildUpdateQuery() {
        const fields = Object.keys(this.field)
            .filter(f => f !== 'id' && f !== 'entidade_negocio')
            .map(f => `${f} = :${f}`)
            .join(', ');

        const query = `UPDATE ${this.#tb_name} 
                       SET ${fields}
                       WHERE entidade_negocio = :entidade_negocio AND id = :id`;

        return query;
    }
}

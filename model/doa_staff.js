export default class StaffUsers {

    #conn = null;
    #found = null;
    #tb_name = 'tb_staff_user';

    #field = {
        id: 0,
        user: '',
        password: ''
    }

    constructor(connection) {
        
        if (!connection) throw new Error('Conexao Invalida.');

        this.#conn = connection;
    }

    get found() {return this.#found}

    set id(id) {this.#field.id = Number(id)}
    get id() {return Number(this.#field.id)}

    set user(user) {this.#field.user = user}
    get user() {return this.#field.user}

    set password(password) {this.#field.password = password}
    get password() {return this.#field.password}

    async ExecuteQuery(query, params = {}) {
        
        const rows = await this.#conn.execute(query, params);
        return rows;
        
    }

    async FindByUser(user) {
        
        const query = `SELECT * FROM ${this.#tb_name} WHERE user = :user`;
        const [rows] = await this.#conn.query(query,{user});

        if (rows) {
            this.id = Number(rows.id);
            this.user = String(rows.user);
            this.password = String(rows.password || '');
            this.#found = true;
        } else {
            this.id = 0;
            this.user = '';
            this.password = '';
            this.#found = false;
        }

        return this.#found ? this.#field : this.#found;

    }

    async FindById(id) {

        const query = `SELECT * FROM ${this.#tb_name} WHERE id = :id`;
        const [rows] = await this.#conn.query(query, { id });

        if (rows) {
            this.id = Number(rows.id);
            this.user = String(rows.user);
            this.password = String(rows.password || '');
            this.#found = true;
        } else {
            this.id = 0;
            this.user = '';
            this.password = '';
            this.#found = false;
        }

        return this.#found ? this.#field : this.#found;
    }

    async Save() {

        let query;

        if (this.id > 0) {
            query = `UPDATE ${this.#tb_name} SET user = :user,password = :password WHERE id = :id`;
        } else {

            query = `INSERT INTO ${this.#tb_name} SET user = :user,password = :password`;
        }

        return await this.#conn.query(query,this.#field);
        
    }

    async Excluir() {
            
        const query = `DELETE FROM ${this.#tb_name} WHERE id = :id`;

        void await this.#conn.query(query,{id: this.#field.id});  
        
    }

}

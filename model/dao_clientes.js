export default class Clientes {

    #conn = null;
    #found = null;
    #tb_name = 'tb_clientes';

    #field = {
        id: 0,
        cpf_cliente: '',
        nom_cliente: '',
        nom_usual: '',
        cel_cliente: '',
        end_cliente: '',
        num_cliente: '',
        bai_cliente: '',
        cid_cliente: '',
        uf_cliente: '',
        cep_cliente: '',
        lat_cliente: '',
        lon_cliente: '',
        dat_cadastro: ''
    }

    constructor(connection) {
        
        if (!connection) throw new Error('Conexao Invalida.');

        this.#conn = connection;
    }

    get found() {return this.#found}

    set id(id) {this.#field.id = Number(id)}
    get id() {return Number(this.#field.id)}

    set cpf_cliente(cpf_cliente) {this.#field.cpf_cliente = cpf_cliente}
    get cpf_cliente() {return this.#field.cpf_cliente}

    set nom_cliente(nom_cliente) {this.#field.nom_cliente = nom_cliente}
    get nom_cliente() {return this.#field.nom_cliente}

    set nom_usual(nom_usual) {this.#field.nom_usual = nom_usual}
    get nom_usual() {return this.#field.nom_usual}

    set cel_cliente(cel_cliente) {this.#field.cel_cliente = cel_cliente}
    get cel_cliente() {return this.#field.cel_cliente}

    set end_cliente(end_cliente) {this.#field.end_cliente = end_cliente}
    get end_cliente() {return this.#field.end_cliente}

    set num_cliente(num_cliente) {this.#field.num_cliente = num_cliente}
    get num_cliente() {return this.#field.num_cliente}

    set bai_cliente(bai_cliente) {this.#field.bai_cliente = bai_cliente}
    get bai_cliente() {return this.#field.bai_cliente}

    set cid_cliente(cid_cliente) {this.#field.cid_cliente = cid_cliente}
    get cid_cliente() {return this.#field.cid_cliente}

    set uf_cliente(uf_cliente) {this.#field.uf_cliente = uf_cliente}
    get uf_cliente() {return this.#field.uf_cliente}

    set cep_cliente(cep_cliente) {this.#field.cep_cliente = cep_cliente}
    get cep_cliente() {return this.#field.cep_cliente}

    set lat_cliente(lat_cliente) {this.#field.lat_cliente = lat_cliente}
    get lat_cliente() {return this.#field.lat_cliente}

    set dat_cadastro(dat_cadastro) {this.#field.dat_cadastro = dat_cadastro}
    get dat_cadastro() {return this.#field.dat_cadastro}

    set lon_cliente(lon_cliente) {this.#field.lon_cliente = lon_cliente}
    get lon_cliente() {return this.#field.lon_cliente}

    async ExecuteQuery(query, params = {}) {
        
        //const match = query.match(/from\s+([\w.]+)/i);

        //if (this.#tb_name != match[1]) throw new Error("Nome da Tabela diferente da Classe DAO_clientes.");

        const rows = await this.#conn.execute(query, params);

        return rows;

    }

    async FindById(id) {

        let query = `SELECT * FROM ${this.#tb_name} WHERE id = :id`;

        const [rows] = await this.#conn.query(query,{id});

        if (rows) {
            this.id = rows.id;
            this.cpf_cliente = rows.cpf_cliente;
            this.nom_cliente = rows.nom_cliente;
            this.nom_usual = rows.nom_usual;
            this.cel_cliente = rows.cel_cliente;
            this.end_cliente = rows.end_cliente;
            this.num_cliente = rows.num_cliente;
            this.bai_cliente = rows.bai_cliente;
            this.cid_cliente = rows.cid_cliente;
            this.uf_cliente = rows.uf_cliente;
            this.cep_cliente = rows.cep_cliente;
            this.lat_cliente = rows.lat_cliente;
            this.lon_cliente = rows.lon_cliente;
            this.dat_cadastro = rows.dat_cadastro;

            this.#found = true;
        } else {
            this.#found = false;
        }

        return this.#found ? rows : this.#found;

    }

    async FindByCpf(cpf) {

        let query = `SELECT * FROM ${this.#tb_name} WHERE cpf_cliente = :cpf`;

        const [rows] = await this.#conn.query(query,{cpf});

        if (rows) {
            this.id = rows.id;
            this.cpf_cliente = rows.cpf_cliente;
            this.nom_cliente = rows.nom_cliente;
            this.nom_usual = rows.nom_usual;
            this.cel_cliente = rows.cel_cliente;
            this.end_cliente = rows.end_cliente;
            this.num_cliente = rows.num_cliente;
            this.bai_cliente = rows.bai_cliente;
            this.cid_cliente = rows.cid_cliente;
            this.uf_cliente = rows.uf_cliente;
            this.cep_cliente = rows.cep_cliente;
            this.lat_cliente = rows.lat_cliente;
            this.lon_cliente = rows.lon_cliente;
            this.dat_cadastro = rows.dat_cadastro;

            this.#found = true;
        } else {
            this.#found = false;
        }

        return this.#found ? rows : this.#found;

    }

    async Save() {

        let query;

        if (this.#found) {
            query = `UPDATE ${this.#tb_name} SET cpf_cliente = :cpf_cliente, nom_cliente = :nom_cliente,nom_usual = :nom_usual,
            cel_cliente = :cel_cliente, end_cliente = :end_cliente, num_cliente = :num_cliente, bai_cliente = :bai_cliente,
            cid_cliente = :cid_cliente, uf_cliente = :uf_cliente, cep_cliente = :cep_cliente,
            lat_cliente = :lat_cliente, lon_cliente = :lon_cliente, dat_cadastro = :dat_cadastro
            WHERE id = :id`;
        } else {

            this.id = await this.#newId();

            query = `INSERT INTO ${this.#tb_name} SET cpf_cliente = :cpf_cliente, nom_cliente = :nom_cliente,nom_usual = :nom_usual,
            cel_cliente = :cel_cliente, end_cliente = :end_cliente, num_cliente = :num_cliente, bai_cliente = :bai_cliente,
            cid_cliente = :cid_cliente, uf_cliente = :uf_cliente, cep_cliente = :cep_cliente,
            lat_cliente = :lat_cliente, lon_cliente = :lon_cliente, id = :id, dat_cadastro = :dat_cadastro`;
        }

        return await this.#conn.query(query,this.#field);
            
    }

    async Excluir(id) {

        const query = `DELETE FROM ${this.#tb_name} WHERE id = :id`;

        void await this.#conn.query(query,{id});
            
    }

    async #newId() {
        
        const query =  `SELECT IFNULL(MAX(id),0) + 1 as newid FROM ${this.#tb_name}`;
        
        const [rows] = await this.#conn.query(query);

        return rows.newid;
            
    }

}

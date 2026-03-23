import { z } from 'zod';

export function validate(schema, data) {
    const result = schema.safeParse(data);
    if (!result.success) {
        const errors = result.error.errors.map((err) => ({ path: err.path.join('.'), message: err.message }));
        const error = new Error(`Validation failed: ${JSON.stringify(errors)}`);
        error.statusCode = 422;
        throw error;
    }
    return result.data;
}

export const authSessionSchema = z.object({
    entidade_negocio: z.number().int().positive().optional(),
    user: z.string().min(1).trim(),
    password: z.string().min(1)
});

export const clienteSalvarSchema = z.object({
    cpf: z.string().regex(/^\d{11}$/),
    nome: z.string().min(1),
    usual: z.string().optional(),
    celular: z.string().optional(),
    ender: z.string().optional(),
    numero: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    uf: z.string().length(2).optional(),
    cep: z.string().optional()
});

export const usuarioSalvarSchema = z.object({
    id: z.coerce.number().int().nonnegative().optional(),
    usuario: z.string().min(1),
    nom_completo: z.string().min(1),
    email: z.string().trim().email().optional(),
    id_perfil: z.coerce.number().int().nonnegative().optional(),
    reset_password: z.union([
        z.boolean(),
        z.coerce.number().int().min(0).max(1)
    ]).transform((value) => {
        if (typeof value === 'boolean') {
            return value;
        }

        return Number(value) === 1;
    }).optional(),
    password: z.string().optional()
});

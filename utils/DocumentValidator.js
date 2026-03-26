export const isValidCpf = (cpf = '') => {
    const raw = String(cpf).replace(/\D/g, '');

    if (!/^\d{11}$/.test(raw)) return false;
    if (/^(\d)\1{10}$/.test(raw)) return false;

    const calculateDigit = (base, factorStart) => {
        let total = 0;

        for (let i = 0; i < base.length; i++) {
            total += Number(base[i]) * (factorStart - i);
        }

        const digit = (total * 10) % 11;
        return digit === 10 ? 0 : digit;
    };

    const firstDigit = calculateDigit(raw.slice(0, 9), 10);
    const secondDigit = calculateDigit(raw.slice(0, 10), 11);

    return firstDigit === Number(raw[9]) && secondDigit === Number(raw[10]);
};


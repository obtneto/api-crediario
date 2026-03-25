export function FormatDateTime(data,locales = 'pt-BR',timezone = '-03:00') {

    const date = new Date(data);

    const options = {
        year: 'numeric',                
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: timezone
    };

    return date.toLocaleString(locales, options).replace(",", " ");
    
}

export function FormatDate(data,locales = 'pt-BR',timezone = '-03:00') {

    const date = new Date(data);

    const options_date = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: timezone
    };

    return date.toLocaleDateString(locales, options_date);
    
}

export function FormatTime(valorHora,locales = 'sv-SE',timezone = '-03:00') {

    const hora  = new Date(valorHora);

    const options_time = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: timezone
    };

    return hora.toLocaleTimeString(locales, options_time);
    
}

import axios from 'axios';

export default class ControllerGeo {

    static async Reverse(req,res) {

        try {

            const {lat,lon} = req.params;

            if (!lat || !lon) {
                return res.status(400).json({msg: 'lat e lon sao obrigatorios'});
            }

            const url = new URL('https://nominatim.openstreetmap.org/reverse');

            url.searchParams.set('lat', lat);
            url.searchParams.set('lon', lon);
            url.searchParams.set('format', 'jsonv2');
            url.searchParams.set('addressdetails', '1');
            url.searchParams.set('accept-language', 'pt-BR');

            const response = await axios.get(url.toString(), {
                headers: {
                    'User-Agent': 'CrediarioWeb/1.0',
                    'Referer': 'http://localhost'
                },
                validateStatus: () => true
            });

            return res.status(response.status).json(response.data);

        } catch (error) {
            if (error.response) {
                return res.status(error.response.status).json(error.response.data);
            }
            return res.status(500).json({msg: error.message});
        }
    }

    static async Geocode(req,res) {
        try {
            const {endereco} = req.query;

            if (!endereco) {
                return res.status(400).json({msg: 'endereco é obrigatorio'});
            }

            const url = new URL('https://nominatim.openstreetmap.org/search');

            url.searchParams.set('q', endereco);
            url.searchParams.set('format', 'jsonv2');
            url.searchParams.set('addressdetails', '1');
            url.searchParams.set('limit', '5');
            url.searchParams.set('accept-language', 'pt-BR');

            const response = await axios.get(url.toString(), {
                headers: {
                    'User-Agent': 'CrediarioWeb/1.0',
                    'Referer': 'http://localhost'
                },
                validateStatus: () => true
            });

            return res.status(response.status).json(response.data);

        } catch (error) {
            if (error.response) {
                return res.status(error.response.status).json(error.response.data);
            }
            return res.status(500).json({msg: error.message});
        }
    }

    static async Route(req,res) {
        try {
            const {origem_lat, origem_lon, destino_lat, destino_lon} = req.query;

            if (!origem_lat || !origem_lon || !destino_lat || !destino_lon) {
                return res.status(400).json({msg: 'origem_lat, origem_lon, destino_lat e destino_lon sao obrigatorios'});
            }

            const url = new URL('https://router.project-osrm.org/route/v1/driving');

            url.searchParams.set('coordinates', `${origem_lon},${origem_lat};${destino_lon},${destino_lat}`);
            url.searchParams.set('overview', 'full');
            url.searchParams.set('geometries', 'geojson');
            url.searchParams.set('steps', 'true');
            url.searchParams.set('languages', 'pt');

            const response = await axios.get(url.toString(), {
                headers: {
                    'User-Agent': 'CrediarioWeb/1.0'
                },
                validateStatus: () => true
            });

            return res.status(response.status).json(response.data);

        } catch (error) {
            if (error.response) {
                return res.status(error.response.status).json(error.response.data);
            }
            return res.status(500).json({msg: error.message});
        }
    }
}
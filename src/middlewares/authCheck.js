const jwt = require('jsonwebtoken')
const secretKey = require("../config/jwt");

const authMiddleware = (req, res, next) => {
    // read the token from header or url 
    //const token = req.headers['x-access-token'] || req.query.token
    
    const token = req.cookies.user;

    //const user_id = req.params.id;; // 환자정보 체크
    
    // token does not exist
    if(!token) {
        return res.status(403).json({
            isSuccess: false,
            message: 'not logged in'
        })
    }

    // create a promise that decodes the token
    const p = new Promise(
        (resolve, reject) => {
            jwt.verify(token, secretKey.secret, (err, decoded) => {
                if(err) reject(err)
                resolve(decoded)
            })
        }
    )

    // if it has failed to verify, it will return an error message
    const onError = (error) => {
        res.status(403).json({
            
            isSuccess: false,
            message: error.message
        })
    }

    // process the promise
    p.then((decoded)=>{
        req.decoded = decoded
        /*
        if(typeof user_id !== typeof undefined && user_id !== decoded.user_id){
            res.json({inSuccess: false, message: '로그인 정보와 다릅니다.'});
            return;
        }*/
        next()
    }).catch(onError)
}

module.exports = authMiddleware
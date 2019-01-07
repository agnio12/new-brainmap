// 사이드바 이미지 불러오기
exports.getMainImg = (req, res) => {
    res.json({ isSuccess : true, 
               result : { href : 'http://52.79.228.196:4000', imgUrl : 'http://52.79.228.196:4000/assets/img/appImg/mainImg.jpg' } });                        
}
// banner 불러오기
exports.getBanner = (req, res) => {
    res.json({ isSuccess : true, 
               result : [
                            { href : 'http://52.79.228.196:4000', imgUrl : 'http://52.79.228.196:4000/assets/img/banners/banner1.png' },
                            { href : 'http://52.79.228.196:4000', imgUrl : 'http://52.79.228.196:4000/assets/img/banners/banner1.png' },
                            { href : 'http://52.79.228.196:4000', imgUrl : 'http://52.79.228.196:4000/assets/img/banners/banner1.png' },
                            { href : 'http://52.79.228.196:4000', imgUrl : 'http://52.79.228.196:4000/assets/img/banners/banner1.png' }
                        ]
             });                        
}
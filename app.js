const express = require('express');
const app = express();

const cookieParser = require('cookie-parser');
const userModel = require('./models/user');
const postModel = require('./models/post');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multerconfig = require('./config/multerconfig');
const path = require('path');


app.use(express.json());
app.use(express.urlencoded({extended : true}));
app.use(cookieParser());

app.use(express.static(path.join(__dirname,"public")));
app.set("view engine","ejs");



app.get('/',function(req, res){
    res.render('index');
})


//TASKS TO BE DONE
//=> sbse pehle check kro ki email se pehle hi koi user to exist nhi krta hai
//=> 
app.post('/register',async function(req,res){
    let{name,username,password,email,age} = req.body;
    let user = await userModel.findOne({email});
    
    if(!user){ //if user not found then user can create an account with this email
        bcrypt.genSalt(10,function(err,salt){
            bcrypt.hash(password,salt,async function(err,hash){
                let user = await userModel.create({
                username,
                name,
                email,
                password : hash,
                age
                })

                let token = jwt.sign({email : email, userid : user._id},"secret");
                res.cookie("token",token);
                // res.send(`you are registered with this email : ${email}`);
                res.redirect('/profile');
            })
        })
        
    }
    else{
        return res.status(500).send("user with this email already exsist");
    }
})

app.get('/login',function(req,res){
    res.render('login');
})

app.post('/login',async function(req,res){
    let{email,password} = req.body;
    let user = await userModel.findOne({email});
    if(!user){
        return res.status(500).send("Email or password is wrong !!");
    }
    bcrypt.compare(password,user.password,function(err,result){
        if(!result){
            return res.status(500).send("Email or password is wrong !!");
        }
        let token = jwt.sign({email,userid : user._id},"secret");
        res.cookie("token",token);
        // console.log(token);
        // res.send(`hello ${user.name}`);
        res.redirect('/profile');
    })
})

app.get('/logout',function(req,res){
    res.cookie("token","");
    res.redirect('/login');
})

app.get('/profile',[isLoggedIn],async function(req,res){
    // console.log(req.user);
    // res.send(`hello user with email ${req.user.email}`);
    let user = await userModel.findOne({email : req.user.email});
    //The .populate method in Mongoose is used to replace the specified paths in a document with documents from other collections
    //basically references jo liya tha uske pure data ko la deta hai 
    await user.populate("posts");
  // console.log(user);
    res.render('profile',{user});
})

//middleware to make routes protected
function isLoggedIn(req,res,next){
    //jo cookie browser se humare pass aa rhi hai agr vo blank hai to iska mtlb user logged in nhi hai
    //kyuki token nhi hai ya token empty hai agr user ne logout kiya hai to.
    if( !req.cookies.token || req.cookies.token === "")
    {
        res.redirect('login');
    }
    else{
    //jo bhi data(email, userid) humne pehli baar token me set kiya tha vo decoded hoke data me chla jayega
        //jwt.verify() => token decode krke PAYLOAD return krta hai 2 data variable
        //jayega =>jwt.sign() data ko encrypt krta hai on the basis of key we provide it 
        let data = jwt.verify(req.cookies.token,"secret");

//req(request) object ke form me HTTP request ko represent krta hai (ye http request user krta hai 2 server)
//when we do req.user tb hum req object me user property bnate hai meaning req object me hum ek variable
//bnate hai jiska naam user hai   
        req.user = data;
        next();
    }
}

//jo bnda post bna rha hai vo logged in hona chahiye => /profile me tbhi ja payega jb vo logged in ho 
//but fir bhi hum check krte hai coz 👇
//agr koi /post route access krna chahiye for hacking or other stuff to vo directly /login pr chla jaye
app.post('/post',[isLoggedIn],async function(req,res){

    let user = await userModel.findOne({email : req.user.email});
    let {content} = req.body;
    //to create post postModel chalana padega
    let post = await postModel.create({
    user : user._id,
    content 
    //abhi post ko pta hai uska user kon hai but user ko nhi pta ki uska post bn chuka hai.
  });
  
  user.posts.push(post._id);
  await user.save(); //user.save ek asynchronous task hai

  res.redirect('/profile');
})

app.get('/like/:id',[isLoggedIn],async function(req,res){
    let post = await postModel.findOne({_id : req.params.id}).populate("user");
    //console.log(req.user);

    //ab agr user like kr chuka hai to dubara like click krne pr like ko hatana hoga 
    if(post.likes.indexOf(req.user.userid) === -1 )
    {
//indexOf ek function hai jo ki array ke elements ke index return krta hai agr use vo element nhi mila
//to vo -1 return krta hai. agr userid nhi mili to us user ne like nhi kiya tha abhi tk post ko
        post.likes.push(req.user.userid);
    }
    else{
// splice ek method hai jo array se element remove krta hai us index se 1 mtlb ek element remove krdo
// us index se start krte hai agr 2 hota to 2 element remove starting from give index        
        post.likes.splice(post.likes.indexOf(req.user.userid),1);
    }
    await post.save();
    res.redirect('/profile');
})

app.get('/edit/:id',[isLoggedIn],async function(req,res){
    let post = await postModel.findOne({_id : req.params.id});
    await post.populate("user");
    // let user = await userModel.findOne({email : req.user.email});
    // res.render('edit',{post,user});
    // console.log(post);
    res.render('edit',{post});
})

app.post('/update/:id',[isLoggedIn],async function(req,res){
    let{content} = req.body;
    await postModel.findOneAndUpdate({_id : req.params.id},{content});
    res.redirect('/profile');
})

app.get('/profile/update',function(req,res){
   res.render('profileUpdate');
});

app.post('/upload',multerconfig.single("image"),[isLoggedIn],async function(req,res){
    let user = await userModel.findOne({email : req.user.email})
    user.profilepic = req.file.filename;
    await user.save();
    res.redirect('/profile');
})

app.listen(3000,function(){
    console.log("server is running");
})
var express = require('express');
const ejs = require('ejs');
const paypal = require('paypal-rest-sdk');
const paypalReciever = require('paypal-rest-sdk');
//var sleep = require('sleep')

var app = express();
var DButilsAzure = require('./DButils');
app.use(express.json());
var port = process.env.port || 3000;
const jwt = require("jsonwebtoken");
const {spawn} = require('child_process');
secret = "gil&hodaya";
var loanAmount=0;
var loanId=0;//default value of id
var loanIdBack=0;


paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': 'AQ0JN4T7VkJQ1JLB4EsUNDaX-2t5kCGX8ydtl3bAFP1BMHuLyPPhBy4UKxkUTXOhwKIVGigTv1FFisLA',
    'client_secret': 'EJ1OAxjgf-Nqe-_WBh6e2yAUscwy8dnXEwtoelhekkSRBlZOMSI1J5-t5vb1NO0mxwZqudaRKGSPJ2-g'
  });

  paypalReciever.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': 'AQ0JN4T7VkJQ1JLB4EsUNDaX-2t5kCGX8ydtl3bAFP1BMHuLyPPhBy4UKxkUTXOhwKIVGigTv1FFisLA',
    'client_secret': 'EJ1OAxjgf-Nqe-_WBh6e2yAUscwy8dnXEwtoelhekkSRBlZOMSI1J5-t5vb1NO0mxwZqudaRKGSPJ2-g'
  });
var cors=require('cors')
app.use(cors())
app.options('*',cors())

app.listen(port, function () {
    console.log('Example app listening on port ' + port);
});

//------------------------------------------------------------------------------

app.use("/private", function(req, res,next){
    const token = req.header("x-auth-token");
    if (!token) res.status(401).send("Access denied. No token provided.");
    try {
        const decoded = jwt.verify(token, secret);
        req.decoded = decoded;
        console.log("end private")
        next(); 
        }
         catch (exception) {
        res.status(400).send("Invalid token.");
    }
});

//---------------------------------------------------------------------------------

app.get('/', function(req,res){
    res.send("Students bank is runing")
})

app.post('/login',function(req,res){
    //TO-DO check validity of parameters
    DButilsAzure.execQuery("select * from users where user_name= '" + req.body.userName+ "' and password='" + req.body.password+ "' " )
    .then(function(result){
        if(result.length==0){
            res.status(400).send("invalid userName or password")
            var r = request("/login") //check why need
             r.abort()                //check why need 
        }
        else{
            payload={name: req.body.userName};
            options = { expiresIn: "1d" };
            const token = jwt.sign(payload, secret, options);
            var userName=req.body.userName;
            //get total loans user gave
            console.log("The user is: "+userName)
           DButilsAzure.execQuery("select SUM(amount) from loans where giver='"+userName+"'")
           .then(function(result){
            var totalLoan=0;
            if(result.length!=0){
                totalLoan=result[0][""];
            }
            console.log("The loan total is: "+userName)

            //get total owea user asked
            DButilsAzure.execQuery("select SUM(amount) from loans where reciever='"+userName+"'")
            .then(function(result){
            var totalOwes=0;
             if(result.length!=0){
                 totalOwes=result[0][""]; 
             }

            res.send({"token":token,"totalLoan":totalLoan,"totalOwes":totalOwes});

            }) 
            .catch(function(err){
                console.log(err)
                res.send(err)
            })
         
            }).catch(function(err){
                console.log(err)
                res.send(err)
            })
    
        }//else of log in
        }).catch(function(err){
            console.log(err)
            res.send(err)
        })
        
 })


 app.post('/register', function(req, res){

    userName=req.body.userName
    password=req.body.password
    fullName=req.body.fullName
    email=req.body.email
    phone=req.body.phone
    grade=req.body.grade
    school=req.body.school
    facebook=req.body.facebook


    DButilsAzure.execQuery("insert into users(user_name,full_name,password,email,phone, Studies_institute, facebook, gpa) values('"+userName+"', '"+fullName+"', '"+password+"', '"+email+"', '"+phone+"', '"+school+"', '"+facebook+"', '"+grade+"')")
    .then(function(result){ 
        res.send({value: "true"})

     } 

    ).catch(function(err){
    console.log(err)
    res.send(err)
    })
 })


//----------------------------------------------------------------------------------


app.use('/private/getPostedLoans' , function (req, res){
    
    userName=req.decoded.name
    DButilsAzure.execQuery("select * from posted_loan where user_name= '" + userName +"' ")
    .then(function(result){
        var loansArray=[];
        for(var i=0;i<result.length;i++){
            loansArray.push(createPostedLoan(result[i]));
        }
        
        res.send(loansArray);
    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })


})


app.use('/private/getRequestLoans' , function (req, res){
    
    userName=req.decoded.name
    DButilsAzure.execQuery("select * from request_loan where user_name= '" + userName +"' ")
    .then(function(result){
        var loansArray=[];
        for(var i=0;i<result.length;i++){
            loansArray.push(createRequstLoan(result[i]));
        }
        
        res.send(loansArray);
    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })


})

//-------------------------------------------------------------------------------

app.use('/private/insertPostedLoan',function(req,res){
    //TO-DO check validity of parameters
    userName=req.decoded.name
    var amount=req.body.amount;
    var period=req.body.period;
    var rankFilter=req.body.rankFilter
    console.log("amount:"+amount)
    console.log("period:"+period)
    console.log("rankFilter:"+rankFilter)
    
    DButilsAzure.execQuery("insert into posted_loan(user_name,amount,period,rank_filter) values('"+userName+"' , "+amount+" ,'"+period+"',"+rankFilter+")")
    .then(function(result){ 
        //get the id of the inserted loan
    DButilsAzure.execQuery("select MAX(id) from posted_loan")
        .then(function(result){ 

            maxId=result[0][""]; 

            res.send({"loanId":maxId});

        } 

        ).catch(function(err){
        console.log(err)
        res.send(err)
        })

     } 

    ).catch(function(err){
    console.log(err)
    res.send(err)
    })


 })


 app.use('/private/insertRequestLoan',function(req,res){
    userName=req.decoded.name;
    var amount=req.body.amount;
    var description=req.body.description;
    var video=req.body.video;

    //add here select for user details to calculate rank

    // clculateRank(userName, amount, 90, function(user_rank){
    //     console.log("The rank is:      "+user_rank)

    var user_rank = req.body.rank;

    DButilsAzure.execQuery("select interest_precent from interests where min_rank<= "+user_rank+" and max_rank>"+user_rank)
    .then(function(result){
        //if the rank is 5-so there is no interest_precent that much so duaflut will be interest precent of 2
        if(result.length!=0){
            var interest_precent=result[0].interest_precent 
        }
        else {
            var interest_precent=2
        }  
        DButilsAzure.execQuery("insert into request_loan(user_name,amount,description,video,interest_precent,user_rank) values('"+userName+"' , "+amount+" ,'"+description+"', '"+video+"', "+interest_precent+", "+user_rank+")")
        .then(function(result){ 
            amount_to_return=amount*(interest_precent/100)
            res.send({"interest":interest_precent,"amount": amount_to_return})
        } 
        
            ).catch(function(err){
            console.log(err)
            res.send(err)
        })

        } 
    
        ).catch(function(err){
        console.log(err)
        res.send(err)
    })

 //   })
    


 })

 app.use('/private/calculateRank', function(req,res){

    userName = req.decoded.name;
    var full_amount = req.body.amount;
    console.log("the full amount from 273 is  "+full_amount)
    var amount = categoryAmount(full_amount)

    DButilsAzure.execQuery("select * from user_details where user_name='"+userName+"'")
    .then(function(result){

        DButilsAzure.execQuery("select gpa from users where user_name='"+userName+"'")
        .then(function(resu){   

        clculateRank(userName, result[0].month_income, result[0].age ,result[0].minus ,result[0].parents_support ,resu[0].gpa ,result[0].bank_loans, 1, result[0].facebook_active, result[0].facebook_friends, result[0].instagrem_account, amount, function(user_rank){
            console.log("The rank is:      "+user_rank)

            DButilsAzure.execQuery("select interest_precent from interests where min_rank<= "+user_rank+" and max_rank>"+user_rank)
            .then(function(result){
                //if the rank is 5-so there is no interest_precent that much so duaflut will be interest precent of 2
                if(result.length!=0){
                    var interest_precent=result[0].interest_precent 
                }
                else {
                    var interest_precent=2
                }  

                res.send({"interest":interest_precent, "userRank": user_rank})

                }).catch(function(err){
                console.log(err)
                res.send(err)
            })

        })
    


            }).catch(function(err){
            console.log(err)
            res.send(err)
        })



 


        }).catch(function(err){
        console.log(err)
        res.send(err)
    })






    //add here select for user details to calculate rank


 })


//------------------------------------------------------------------------------

app.use('/private/loansIGaved' , function (req, res){
    userName=req.decoded.name
    DButilsAzure.execQuery("select * from loans where giver= '" + userName +"' ")
    .then(function(result){
        var loansArray=[];
        for(var i=0;i<result.length;i++){
            loansArray.push(createLoan(result[i]));
        }
        
        res.send(loansArray);
    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })


})


app.use('/private/loansIRecieved' , function (req, res){
    userName=req.decoded.name
    DButilsAzure.execQuery("select * from loans where reciever= '" + userName +"' ")
    .then(function(result){
        var loansArray=[];
        for(var i=0;i<result.length;i++){
            loansArray.push(createLoan(result[i]));
        }
        
        res.send(loansArray);
    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })


})

//-----------------------------------------------------------------------------------

// recieve postedLoan, and returns all the requestedLoans that fit the requirments of the publisher of the loan
app.use('/private/getAllPotenialLoanRequests' , function (req, res){
    userName=req.decoded.name
    rankFilter=req.body.rankFilter
    amount=req.body.amount

    DButilsAzure.execQuery("select * from request_loan where user_rank>="+rankFilter+"and amount<="+amount+"and not user_name='"+userName+"'")
    .then(function(result){
        var loansArray=[];
        for(var i=0;i<result.length;i++){
            loansArray.push(createRequstLoan(result[i]));
        }
        
        res.send(loansArray);
    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })


})

//------------------------------------------------------------------------------------
//code by hodaya

//add to approval_proggres new record---meaning that the giver want to borrow money to reciever. is_approved=0 since the reciever need to reapproved
//++add to mail under category 1 for reciever!!
app.use('/private/AgreementFromGiver',function(req,res){

    var giver=req.body.giver;

    var receiver=req.body.reciever;
    var expirationDate=req.body.expirationDate;
    var description=req.body.description;
    var amount=req.body.amount;
    var interest=req.body.interest;
    var offerId=req.body.offerId;
    var requestId=req.body.requestId;
    var isApp=0;



    DButilsAzure.execQuery("insert into approval_proggres(giver,reciever,experation_date,description,amount,interest,offer_loan_num,requested_loan_num,is_approved) values('"+giver+"' , '"+receiver+"' ,'"+expirationDate+"', '"+description+"', "+amount+", "+interest+", "+offerId+", "+requestId+", "+isApp+")")
        .then(function(result){ 
            res.send("OK");
        } 
        
            ).catch(function(err){
            console.log(err)
            res.send(err)
        })

})

//send all loans waiting for reciever approve (isApproved=0)
//++remove category 1 for this user
app.use('/private/getAllwaitingMsg' , function (req, res){
    userName=req.decoded.name
    DButilsAzure.execQuery("select * from approval_proggres where reciever= '" + userName +"' and is_approved=0")
    .then(function(result){
        var loansArray=[];
        for(var i=0;i<result.length;i++){
            loansArray.push(createApprovalData(result[i]));
        }
        
        res.send(loansArray);
    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })


})

//update approval_proggres to approved by reciever.
// ++ add notification for giver that he need to give money (category 2)
//++remove request and offer loan -- id from approval_proggres.

app.use('/private/AgreementFromReciever' , function (req, res){
    userName=req.decoded.name //this is the giver user
    var loanid=req.body.loanId
    //var
    DButilsAzure.execQuery("UPDATE approval_proggres SET is_approved = 1 WHERE id="+loanid)
    .then(function(result){
        DButilsAzure.execQuery("select offer_loan_num, requested_loan_num from approval_proggres WHERE id="+loanid)
        .then(function(result){
        


            deleteRow("posted_loan",result[0].offer_loan_num)//delete specific loan offer
            deleteRow("request_loan",result[0].requested_loan_num)//delete specific loan request
  
            res.send("ok")
    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })


    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })

})


//send all loan waiting to be payed by giver. (isApproved=1)
//remove category 2 for this user
app.use('/private/getAllwaitingForPayment' , function (req, res){
    userName=req.decoded.name
    DButilsAzure.execQuery("select * from approval_proggres where giver= '" + userName +"' and is_approved=1")
    .then(function(result){
        var loansArray=[];
        for(var i=0;i<result.length;i++){
            loansArray.push(createApprovalData(result[i]));
        }
        
        res.send(loansArray);
    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })


})




//send all msg with category 3 for this user--all loans that been transfer for his account
app.use('/private/gatAllCompletedLoans', function(req,res){
    userName=req.decoded.name

    DButilsAzure.execQuery("select * from mail where user_name= '" + userName +"' and category = 3")
    .then(function(result){

        var msgs=[];
        for(var i=0;i<result.length;i++){
            msgs.push(createmsg(result[i]));
        }
        
        res.send(msgs);
    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })

})


//send all msg with category 4 for this user--all loans that been returned for his account
app.use('/private/gatAllPayBackCompletedLoans', function(req,res){
    userName=req.decoded.name

    DButilsAzure.execQuery("select * from mail where user_name= '" + userName +"' and category = 4")
    .then(function(result){

        var msgs=[];
        for(var i=0;i<result.length;i++){
            msgs.push(createmsg(result[i]));
        }
        
        res.send(msgs);
    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })

})


//send all loans that the reciever need to pay back in this month-- monthly reminder
app.use('/private/getMonthlyBalance', function(req, res){
    userName=req.decoded.name
    DButilsAzure.execQuery("select * from loans where reciever= '" + userName +"' ")
    .then(function(result){
        var loansArray=[];
        for(var i=0;i<result.length;i++){
            if(monthGap(result[i].experation_date)){
                console.log("from 467---- id : "+result[i].id)
                loansArray.push(createLoan(result[i]));
            }
        }
        
        res.send(loansArray);
    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })

})

app.post('/checkUserFullName', function(req, res){
    userName=req.body.userName
    fullName=req.body.fullName

    DButilsAzure.execQuery("select * from users where user_name='"+userName+"' and full_name='"+fullName+"'")
    .then( function(result){
        if(result.length==0){res.send({value:"false"})}
        res.send({value:"true"})
    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })

    
})


app.post('/getAllReviews', function(req,res){
    DButilsAzure.execQuery("select * from user_reviews where user_name= '" + userName +"'")
    .then(function(result){

        var reviews=[];
        for(var i=0;i<result.length;i++){
            reviews.push(createreveiw(result[i]));
        }
        
        res.send(reviews);
    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })

})



app.use('/private/sendReview', function(req, res){

    review_user = req.decoded.name
    userName = req.body.userName
    review_ = req.body.review
    score = req.body.score

    DButilsAzure.execQuery("insert into user_reviews(user_name, reviewer, review, review_score) values('"+userName+"' , '"+review_user+"' ,'"+review_+"', "+score+")")
        .then(function(result){ 
            DButilsAzure.execQuery("DELETE FROM mail WHERE category=4 and user_name='"+review_user+"' and partner='"+userName+"'")
            .then( function(result){
                console.log("record deleted")
                res.send('ok')
            })
            .catch(function(err){
                console.log(err)
            }) 
        } 
            ).catch(function(err){
            console.log(err)
            res.send(err)
        })

})


app.use('/private/fillPersonalDetails', function(req, res){
    userName = req.decoded.name

    DButilsAzure.execQuery("select * from user_details where user_name='"+userName+"'")
    .then(function(result){ 
        if(result.length>0){
            res.send({value: "true"})
        }
        else{
            res.send({value: "false"})
        }
     }).catch(function(err){
    console.log(err)
    res.send(err)
    })
})

app.use('/private/createPersonalDetails', function(req,res){
    user_name = req.decoded.name
    income = req.body.income
    age = req.body.age
    parents = req.body.parents
    minus = req.body.minus
    debts = req.body.debts
    facebook = req.body.facebook
    friends = req.body.friends
    instagram = req.body.instagram

    DButilsAzure.execQuery("insert into user_details(user_name, month_income, age, minus, parents_support, bank_loans, facebook_active, facebook_friends, instagrem_account) values('"+userName+"' , "+income+" ,"+age+", "+minus+" ,"+parents+", "+debts+" ,"+facebook+", "+friends+" ,"+instagram+")")
        .then(function(result){ 
            console.log("on func$$$$$$$$$$$$")
            res.send("ok")
        } 
            ).catch(function(err){
            console.log(err)
            res.send(err)
        })


    
})




//------------------------------------------------------------------------------------


app.use('/getUserInformation' , function(req,res) {
    
    userName=req.body.userName

    DButilsAzure.execQuery("select * from users where user_name='"+userName+"'")
    .then( function(result){
        ans=createUser(result[0])
        res.send(ans)
    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })
})

//------------------------------------------------------------------------------------------
//paypal route for giver

app.set('view engine', 'ejs');

//route paypal payment
app.post('/pay', (req, res) => {
    console.log("insert pay")
    loanAmount=req.body.amount;
    loanId=req.body.loanId;

    const create_payment_json = {
      "intent": "sale",
      "payer": {
          "payment_method": "paypal"
      },
      "redirect_urls": {
          "return_url": "http://sbserver-env.eba-ppt5gwe6.us-east-2.elasticbeanstalk.com/success",
          "cancel_url": "http://sbserver-env.eba-ppt5gwe6.us-east-2.elasticbeanstalk.com/cancel"
      },
      "transactions": [{
          "item_list": {
              "items": [{
                  "name": "Loan",
                  "sku": "001",
                  "price": loanAmount,
                  "currency": "ILS",
                  "quantity": 1
              }]
          },
          "amount": {
              "currency": "ILS",
              "total": loanAmount
          },
          "description": "Loan trasfer"
      }]
  };
  
  paypal.payment.create(create_payment_json, function (error, payment) {
    if (error) {
      console.log("error in 48")
        throw error;
    } else {
        console.log("insert to create")
      let i=0;
        for(i = 0;i < payment.links.length;i++){
          if(payment.links[i].rel === 'approval_url'){
            var link=payment.links[i].href+""
            break;
            //res.redirect(payment.links[i].href);
          }
        }
        res.send({"paymentUrl":link})
  
    }
  });
  
  });
  
  app.get('/success', (req, res) => {
    console.log("insert to success")
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;
    console.log("payerId    "+payerId)
    console.log("paymentId    "+paymentId)

  
    const execute_payment_json = {
      "payer_id": payerId,
      "transactions": [{
          "amount": {
              "currency": "ILS",
              "total": loanAmount
          }
      }]
    };
  
    paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
      if (error) {
          console.log(error.response);
          throw error;
      } else {
          console.log(JSON.stringify(payment));
          approvePay()

          var fallbackToStore = function() {
            console.log("fall route back")
          };
          var openApp = function() {
            res.redirect('studentsbank://');
          };
          var triggerAppOpen = function() {
            openApp();
            setTimeout(fallbackToStore, 250);
          };
          triggerAppOpen()

          
      }
  });
  });
  
  app.get('/cancel', (req, res) => res.send('Cancelled'));

//------------------------------------------------------------------------------------------



//------------------------------------------------------------------------------------------
//paypal route for recicer

app.set('view engine', 'ejs');


app.post('/payBack', (req, res) => {
    console.log("pay back!!")
    loanAmount=req.body.amount;
    loanIdBack=req.body.loanId;
    console.log("the id got:   "+loanIdBack)

    const create_payment_json = {
      "intent": "sale",
      "payer": {
          "payment_method": "paypal"
      },
      "redirect_urls": {
          "return_url": "http://sbserver-env.eba-ppt5gwe6.us-east-2.elasticbeanstalk.com/successBack",
          "cancel_url": "http://sbserver-env.eba-ppt5gwe6.us-east-2.elasticbeanstalk.com/cancel"
      },
      "transactions": [{
          "item_list": {
              "items": [{
                  "name": "Loan",
                  "sku": "001",
                  "price": loanAmount,
                  "currency": "ILS",
                  "quantity": 1
              }]
          },
          "amount": {
              "currency": "ILS",
              "total": loanAmount
          },
          "description": "Loan trasfer"
      }]
  };
  
  paypalReciever.payment.create(create_payment_json, function (error, payment) {
    if (error) {
      console.log("error in 48")
        throw error;
    } else {
      let i=0;
        for(i = 0;i < payment.links.length;i++){
          if(payment.links[i].rel === 'approval_url'){
            var link=payment.links[i].href+""
            break;
            //res.redirect(payment.links[i].href);
          }
        }
        res.send({"paymentUrl":link})
  
    }
  });
  
  });
  
  app.get('/successBack', (req, res) => {
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;
  
    const execute_payment_json = {
      "payer_id": payerId,
      "transactions": [{
          "amount": {
              "currency": "ILS",
              "total": loanAmount
          }
      }]
    };
  
    paypalReciever.payment.execute(paymentId, execute_payment_json, function (error, payment) {
      if (error) {
          console.log(error.response);
          throw error;
      } else {
          console.log(JSON.stringify(payment));
          approvePayBack()
          res.send('Success pay back');
      }
  });
  });
  
  app.get('/cancel', (req, res) => res.send('Cancelled'));

//------------------------------------------------------------------------------------------
//user object
class user {
    constructor(userName,mail,phone,studiesInstitute,facebook,fullName,adress) {
        this.userName = userName;
        this.mail=mail;
        this.phone=phone;
        this.studiesInstitute=studiesInstitute;
        this.facebook=facebook
        this.fullName=fullName
        this.adress=adress
    }
}
function createUser (arr){
    return new user(arr.user_name,arr.email, arr.phone, arr.Studies_institute,arr.facebook,arr.full_name,arr.adress);
}


class msg{
    constructor(msg, partner){
        this.msg=msg;
        this.partner=partner;
    }
}

function createmsg(arr){
    return new msg(arr.massage, arr.partner)
}

class review{
    constructor(reviewer, review, review_score){
        this.reviewer=reviewer
        this.review=review
        this.review_score=review_score
    }
}

function createreveiw(arr){
    return new review(arr.reviewer, arr.review, arr.review_score)
}




//postedLoan object
class postedLoan {
    constructor(id,userName,amount,period,rankFilter) {
        this.id = id;
        this.userName=userName;
        this.amount=amount;
        this.period=period;
        this.rankFilter=rankFilter;
    }
}
function createPostedLoan (arr){
    return new postedLoan(arr.id,arr.user_name, arr.amount, arr.period, arr.rank_filter);
}




//requestLoan object
class requestLoan {
    constructor(id,userName,amount,description,video,interestPrecent) {
        this.id = id;
        this.userName=userName;
        this.amount=amount;
        this.description=description;
        this.video=video;
        this.interestPrecent=interestPrecent;
    }
}
function createRequstLoan (arr){
    return new requestLoan(arr.id,arr.user_name, arr.amount, arr.description, arr.video, arr.interest_precent);
}


//loan object
class loan {
    constructor(id,giver,reciever,experationDate,description, interest,amount) {
        this.id = id;
        this.giver=giver;
        this.reciever=reciever;
        this.experationDate=experationDate;
        this.interest=interest;
        this.amount=amount;
        this.description=description;
    }
}
function createLoan (arr){
    return new loan(arr.id, arr.giver, arr.reciever, arr.experation_date,arr.description, arr.interest,arr.amount);
}


//approval data object
class ApprovalData {
    constructor(id,giver,reciever,experation_date,description,amount,interest,offer_loan_num,requested_loan_num,is_approved) {
        this.agreeId = id;
        this.giver=giver;
        this.reciever=reciever;
        this.expirationDate=experation_date;
        this.description=description;
        this.amount=amount;
        this.interest=interest;
        this.offerId=offer_loan_num;
        this.requestId=requested_loan_num;
        this.is_approved=is_approved;

    }
}
function createApprovalData(arr){
    return new ApprovalData(arr.id, arr.giver, arr.reciever, arr.experation_date,arr.description, arr.amount, arr.interest, arr.offer_loan_num, arr.requested_loan_num,arr.is_approved);
}


function deleteRow(tableName,idRow){
    DButilsAzure.execQuery("DELETE FROM "+tableName+" WHERE id="+idRow)
    .then( function(result){
        console.log("record deleted")
    })
    .catch(function(err){
        console.log(err)
    })
}


function approvePay(){
    //delete record of loanId that in progress
    //insert to loans all detailes
    //insert to mail with category 3

    DButilsAzure.execQuery("select * from approval_proggres where id= " + loanId )
    .then(function(result){
        var loanDetails=createApprovalData(result[0]);
        var giver=loanDetails.giver
        var reciever=loanDetails.reciever
        var experation_date=loanDetails.expirationDate
        var description=loanDetails.description
        var amount=loanDetails.amount
        var interest=loanDetails.interest


        DButilsAzure.execQuery("DELETE FROM approval_proggres WHERE id="+loanId)
        .then( function(result){
            console.log("record deleted 663")

            DButilsAzure.execQuery("insert into loans(giver,reciever,experation_date,description,amount,interest) values('"+giver+"' , '"+reciever+"' ,'"+experation_date+"','"+description+"',"+amount+","+interest+")")
            .then( function(result){

                console.log("record insert 668")
                var massege="The loan for "+description+" you asked from "+giver+" has succssesfuly transfer to your account!"
                DButilsAzure.execQuery("insert into mail(user_name,category,massage,partner) values('"+reciever+"' , 3 ,'"+massege+"','"+giver+"')")
                .then( function(result){

            })
            .catch(function(err){
                console.log(err)
            })
            })
            .catch(function(err){
                console.log(err)
            })
        })
        .catch(function(err){
            console.log(err)
        })  
    })
    .catch(function(err){
        console.log(err)
    })


}




function approvePayBack(){
    //delete record of loanId that in loans
    //insert to loans history all detailes
    //insert to mail with category 4

    console.log("from approve back  id is:   "+loanIdBack)
    DButilsAzure.execQuery("select * from loans where id= " + loanIdBack )
    .then(function(result){
        var loanDetails=createLoan(result[0]);
        var giver=loanDetails.giver
        var reciever=loanDetails.reciever
        var experation_date=loanDetails.expirationDate
        var description=loanDetails.description
        var amount=loanDetails.amount
        var interest=loanDetails.interest


        DButilsAzure.execQuery("DELETE FROM loans WHERE id="+loanIdBack)
        .then( function(result){
            console.log("record deleted 833")

            DButilsAzure.execQuery("insert into loans_history(giver,reciever,experation_date,description,amount,interest) values('"+giver+"' , '"+reciever+"' ,'"+experation_date+"','"+description+"',"+amount+","+interest+")")
            .then( function(result){

                console.log("record insert 668")
                var massege="The loan for "+description+" you gave to "+reciever+" has succssesfuly returned to your account!"
                DButilsAzure.execQuery("insert into mail(user_name,category,massage,partner) values('"+giver+"' , 3 ,'"+massege+"','"+reciever+"')")

                .then( function(result){

            })
            .catch(function(err){
                console.log(err)
            })
            })
            .catch(function(err){
                console.log(err)
            })
        })
        .catch(function(err){
            console.log(err)
        })  
    })
    .catch(function(err){
        console.log(err)
    })


}

function monthGap(date){
    try{
        dateDetails=date.split(/[-\/]+/)
        d = new Date();
        currMonth = parseInt(d.getMonth());
        
        curr=parseInt(currMonth, 10)
        curr=curr+1
        
        if(curr == parseInt(dateDetails[1], 10)){
            return true
        }
        if(parseInt(currMonth, 10)==12 && parseInt(dateDetails[1], 10)==1){
            return true
        }
        return false
    }
    catch(err){
        console.log("Date Convert error "+err)
    }
    



}

function categoryAmount(full_amount){
    if (full_amount < 500){return 0;}
    if (full_amount < 1000){return 1;}
    if (full_amount < 1500){return 2;}
    if (full_amount < 2000){return 3;}
    if (full_amount < 2500){return 4;}
    if (full_amount < 3000){return 5;}
    return 6;
}


function clculateRank(userName, income, age, minus, parents, gpa, bank_loans, facebook, active, friends, instagam, amount, callback){
    console.log("####################got to 1163")
    weigthML = 0.8
    weigthReview = 0.2
    rankRev = 0
    rankML(userName, income, age, minus, parents, gpa, bank_loans, facebook, active, friends, instagam, amount, function(rankMl){
        
    //extract scors by other users
    DButilsAzure.execQuery("select AVG(review_score) from user_reviews where user_name='"+userName+"'")
    .then(function(result){
        try{
        if(isNaN(parseFloat(result[0][""] ))){
            weigthML = 1;
            weigthReview = 0;
            rankRev=0;
        }
        else{
            rankRev = parseFloat(result[0][""])
        }
    }
    catch(err){rankRev = 0; weigthML = 1;}
        console.log("The weigthML is:      "+weigthML)
        console.log("The weigthReview is:      "+weigthReview)
        console.log("The rankRev is:      "+rankRev)
        console.log("The rankML is:      "+rankMl)

        callback(weigthML*rankMl + weigthReview*rankRev)
    
})
.catch(function(err){
    console.log(err)
})



    })







    // DButilsAzure.execQuery("select * from user_details where user_name='"+userName+"'")
    //     .then(function(result){

    //         try{
    //             var rankML;
    //             // spawn new child process to call the python script
    //             const python = spawn('python', ['script.py',result[1],result[2] ,result[3] ,result[4] ,GPA , ,result[5], 1, result[6],result[7],result[8],amount]);
    //             // collect data from script
    //             python.stdout.on('data', function (data) {
    //              console.log('Pipe data from python script ...');
    //              rankML = data.toString();
    //              console.log("The rankML from python open is:      "+rankML)
    //             });
    //             // in close event we are sure that stream from child process is closed
    //             python.on('close', (code) => {
    //             console.log(`child process close all stdio with code ${code}`);



    //             //extract scors by other users
    //             DButilsAzure.execQuery("select AVG(review_score) from user_reviews where user_name='"+userName+"'")
    //                 .then(function(result){
                        
    //                     if(result.length == 0){
    //                         weigthML = 1;
    //                         weigthReview = 0;
    //                     }
    //                     else{
    //                         rankRev = parseFloat(result[0][""])
    //                         console.log("The result is:      "+result[0][""])
    //                     }
    //                     console.log("The weigthML is:      "+weigthML)
    //                     console.log("The weigthReview is:      "+weigthReview)
    //                     console.log("The rankRev is:      "+rankRev)
    //                     console.log("The rankML is:      "+rankML)

    //                     return weigthML*rankML + weigthReview*rankRev
                    
    //             })
    //             .catch(function(err){
    //                 console.log(err)
    //             })
                

    //             });
    //         }
    //         catch(err){
    //             console.log(err)
    //         }


         
    // })
    // .catch(function(err){
    //     console.log(err)
    //     res.send(err)
    // })

}



app.get('/test' ,function(req,res){
    DButilsAzure.execQuery("select * from users where name='gil'")
        .then(function(result){
         res.send([{ans:3}]);
    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })
})



app.post('/postTest', function(req,res){
   
    var username=req.body.ans;
    console.log("ans is      "+username)
    res.send({ans:7})
})

app.post('/tokenTest', function(req,res){
   
    const token=req.header("x-auth-token")
    console.log("ans is      "+token)
    res.send({ans:123})
})


app.post('/jsonTest', function(req,res){
    if(!req.body.name){
        console.log("hara")
    }
   
    console.log("from android------- "+req.body)
    console.log("from android------- "+req.body.name)

    res.send({ans:"hodi"})
})

app.get('/python', (req, res) => {
    try{
        var dataToSend;
        // spawn new child process to call the python script
        const python = spawn('python', ['script.py',3,1,1,1,1,1,1,1,1,1,0]);
        // collect data from script
        python.stdout.on('data', function (data) {
         console.log('Pipe data from python script ...');
         dataToSend = data.toString();
        });
        // in close event we are sure that stream from child process is closed
        python.on('close', (code) => {
        console.log(`child process close all stdio with code ${code}`);
        // send data to browser
        res.send(dataToSend)
        });
    }
    catch(err){
        console.log(err)
    }
   
    
   })



   function rankML(userName, income, age, minus, parents, gpa, bank_loans, facebook, active, friends, instagam, amount,callback){
    var dataToSend;
    const python = spawn('python', ['script.py', income, age, minus, parents, 1, bank_loans, facebook, active, friends, instagam, amount]);

    // collect data from script
    python.stdout.on('data', function (data) {
        console.log('Pipe data from python script ...');
        dataToSend = data.toString();
        console.log(dataToSend+'    Pipe data from python script ...');
    });
    // in close event we are sure that stream from child process is closed
    python.on('close', (code) => {
    console.log(`child process close all stdio with code ${code}`);
    // send data to browser
    if(dataToSend == null){
        console.log("the data to send is null on line 1347")
        dataToSend=3}
    callback(dataToSend)
    });

   }
    
   
    

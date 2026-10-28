Act like a backend and infrastructure Developer, we are building a backend for an application

we are handling the backend for the application

the app is a banking app, that already in use but will be modified

as the mock app, we will build the backend for the app using Javascript as the server and Data routing

we will build 3 databases 
- Users (only 5 active Users for now
"Abdullah M" , "Abdullah S" , "Meshal" , "Sultana", "Rasel")
- games (build it with only one for testing)
- Places and Catagories 

# Database 

# Users : 
- a small Auth using name and four digits
- account Balance 
- 60 days of spendings exampless, (Per day/week/month/year) including what catagory had been spent on and price 

- Groups (filtering friends)

# EXAMPLE :

 Name    | Balance |   Purchase | Seller  | Catagory      | DATE 
"Meshal" |  60SAR  |  30 SAR    | ALBAIK  | Resturant     | Date


# Games Database
this database will hold 3 games insidse it (make one as an example for now "Flappy Bird")

## Game System:
the gaming system will be for who's gonna pay the bill, 
3 games, in points system, the highest points user pays the bill 
it will start randomly one of the 3 games, to gather points, when the first game is done, we move to the second game, and the third, who gets the highest points wins and pay the bill




# Places and Catagories Database
This database will have 7 templates inside the catagories
- Food
- Cafe
- Health 
- Shopping 
- Groceries 
- Transportaion
- Entertainment 



# Plan 

3 databases, has to be an Active Directory, no authentication between them should exists (cause no password in it too)




# 1 Ai Features

we will have an Ai financial Analyst path 

using the spending data to make a daiy plan, a hangout plan 

## Mechanisim 
the User will choose thier budgets for the trip, and the Ai will make a plan, depending on the minimum budget (to prevent awkwardness)


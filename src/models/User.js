import {DataTypes} from "sequelize";
import sequelize from "../config/database.js";

const User = sequelize.define("User" , {
    id : {
        type : DataTypes.INTEGER,
        primaryKey : true,
        autoIncrement : true
    },
    name : {
        type : DataTypes.STRING,
        allowNull : false,
        validate : {
            len : {
                args : [2 , 60],
                msg : "Name must be between 2 and 60 characters long"
            },
            notEmpty : true
        }
    },
    email : {
        type : DataTypes.STRING,
        allowNull : false,
        unique : true,
        validate: {
        isEmail: true,
      },
    },
    password : {
        type : DataTypes.STRING,
        allowNull : false,
        validate : {
            len : {
                args : [60 , 60],
                msg : "Password must be between 4 and 32 characters long"
            }
        }
    },
    role : {
        type : DataTypes.ENUM("admin" , "engineer" , "viewer"),
        defaultValue : "engineer",
        allowNull : false,
    },
},
    {
        timestamps : true,
        tableName: "users",
        freezeTableName: true,
    }
)

export default User;
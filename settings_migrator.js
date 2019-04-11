const DefaultSettings = {
    "enabled": true,        // 模块启动开关
    "sendToParty": false,   // 发送真实组队频道通知
    "sendToStream": false,  // 关闭队长通知, 并将消息发送到代理频道
    "FirstBossActions": [   // 1王攻击动作
        {id: 106, msg: '重击'},
        {id: 107, msg: '后喷(击退)'},
        {id: 108, msg: '点名(击飞)'},
        {id: 109, msg: '滚石'},
        {id: 110, msg: '滚石'},
        {id: 301, msg: '食人花(眩晕)'},
        {id: 307, msg: '笼子(禁锢)'},
        {id: 309, msg: '1朵花-鉴定!!'},
        {id: 310, msg: '2朵花-鉴定!!'},
        {id: 116, msg: '全屏攻击!!'},
        {id: 312, msg: '金色花!!'}
    ],
    "SecondBossActions": [  // 2王攻击动作
        {id: 105, msg: '翻滚'},
        {id: 113, msg: '双手(眩晕)'},
        {id: 114, msg: '三连地板(靠近)'},
        {id: 116, msg: '(前砸) (后砸)'},
        {id: 301, msg: '↓ 捶地(远离) | 旋转(击退)'},
        {id: 302, msg: '↑ 旋转(靠近) | 捶地(击飞)'}
    ],
    "ThirdBossActions": [   // 3王攻击动作
        {id: 118, msg: '三连击(左-右-喷)'},
        {id: 143, msg: '←← 左后 ←←'},
        {id: 145, msg: '←← 左后 ←←'},
        {id: 146, msg: '←← 左后 (扩散)', sign_degrees: 325, sign_distance: 370},
        {id: 154, msg: '←← 左后 (扩散)', sign_degrees: 325, sign_distance: 370},
        {id: 144, msg: '→→ 右后 →→'},
        {id: 147, msg: '→→ 右后 →→'},
        {id: 148, msg: '→→ 右后 (扩散)', sign_degrees: 25, sign_distance: 388},
        {id: 155, msg: '→→ 右后 (扩散)', sign_degrees: 25, sign_distance: 388},
        {id: 161, msg: '(后砸) (前砸)'},
        {id: 162, msg: '(后砸) (前砸)'},
        {id: 213, msg: '尾巴'},
        {id: 215, msg: '尾巴'},

        {id: 139, msg: '顺时针 (摆头) 王打→右边', sign_degrees: 270, sign_distance: 200}, //151
        {id: 150, msg: '顺时针 (落地) 王打→右边', sign_degrees: 270, sign_distance: 200}, //151
        {id: 141, msg: '逆时针 (摆头) 王打←左边', sign_degrees: 90, sign_distance: 200}, //153
        {id: 152, msg: '逆时针 (落地) 王打←左边', sign_degrees: 90, sign_distance: 200}, //153

        {id: 300, msg: '一次觉醒 (推人)', level_Msg: ['一层', '二层', '三层', '<font color="#FF0000">爆炸! 爆炸!</font>']},
        {id: 399, msg: '二次觉醒 (推人)', level_Msg: ['一层', '<font color="#FF0000">爆炸! 爆炸!</font>']},
        {id: 360, msg: '爆炸!!爆炸!!'}
    ]
};

module.exports = function MigrateSettings(from_ver, to_ver, settings) {
    if (from_ver === undefined) {
        // Migrate legacy config file
        return Object.assign(Object.assign({}, DefaultSettings), settings);
    } else if (from_ver === null) {
        // No config file exists, use default settings
        return DefaultSettings;
    } else {
        // Migrate from older version (using the new system) to latest one
        if (from_ver + 1 < to_ver) {
            // Recursively upgrade in one-version steps
            settings = MigrateSettings(from_ver, from_ver + 1, settings);
            return MigrateSettings(from_ver + 1, to_ver, settings);
        }
        
        // If we reach this point it's guaranteed that from_ver === to_ver - 1, so we can implement
        // a switch for each version step that upgrades to the next version. This enables us to
        // upgrade from any version to the latest version without additional effort!
        switch(to_ver) {
            default:
                let oldsettings = settings
                
                settings = Object.assign(DefaultSettings, {});
                
                for(let option in oldsettings) {
                    if(settings[option]) {
                        settings[option] = oldsettings[option]
                    }
                }
                
                break;
        }
        
        return settings;
    }
}

String.prototype.clr = function (hexColor) { return `<font color='#${hexColor}'>${this}</font>` };
const Vec3 = require('tera-vec3');
// 定义恒量
const MapID = [9782, 9982, 3019];					// 地区坐标 zone 区分副本 下级/上级/7人
const HuntingZn = [782, 982, 3019];					// 大型怪物 huntingZoneId 区分副本 下级/上级/7人
const BossID = [1000, 2000, 3000];					// 大型怪物 templateId 区分副本 1-2-3王

module.exports = function GrottoOfLostSoulsGuide(mod) {
	const command = mod.command || mod.require.command;
	
	if (mod.proxyAuthor !== 'caali') {
		const options = require('./module').options
		if (options) {
			const settingsVersion = options.settingsVersion
			if (settingsVersion) {
				mod.settings = require('./' + (options.settingsMigrator || 'settings_migrator.js'))(mod.settings._version, settingsVersion, mod.settings)
				mod.settings._version = settingsVersion
			}
		}
	}
	// 定义变量
	let isTank = false,								// 坦克职业 / 打手职业
		insidemap = false,							// 确认进入副本地图
		insidezone = false,							// 确认进入BOSS地图
		whichmode = 0,								// 确认副本上/下级
		whichboss = 0,								// 判定当前是哪个王

		hooks = [],
		boss_CurLocation,							// BOSS坐标
		boss_CurAngle,								// BOSS角度

		uid0 = 999999999n,							// 花朵UID
		uid1 = 899999999n,							// 龙头UID
		uid2 = 799999999n,							// 告示牌UID

		curLocation,								// 地面提示 坐标 x y z
		curAngle,									// 地面提示 角度

		sign_CurLocation,							// 水波石碑 坐标
		sign_CurAngle,								// 水波石碑 角度

		power = false,								// 充能计数
		Level = 0,									// 充能层数
		levelMsg = [],								// 充能文字 数组
		powerMsg = '';								// 充能文字

	mod.command.add('殿堂', (arg) => {
		if (!arg) {
			mod.settings.enabled = !mod.settings.enabled;
			command.message('辅助提示 ' + (mod.settings.enabled ? '启用'.clr('56B4E9') : '禁用'.clr('E69F00')));
		} else {
			switch (arg) {
				case "组队":
					mod.settings.sendToParty = !mod.settings.sendToParty;
					command.message('发送通知 ' + (mod.settings.sendToParty ? '组队'.clr('56B4E9') : '自己'.clr('E69F00')));
					break;
				case "代理":
					mod.settings.sendToStream = !mod.settings.sendToStream;
					command.message('代理频道 ' + (mod.settings.sendToStream ? '启用'.clr('56B4E9') : '禁用'.clr('E69F00')));
					break;
				case "debug":
					command.message('模块开关: ' + `${mod.settings.enabled}`.clr('00FFFF'));
					command.message('副本地图: ' + insidemap);
					command.message('区域位置: ' + insidezone);
					command.message('副本难度: ' + whichmode);
					command.message('副本首领: ' + whichboss);
					command.message('发送通知 ' + (mod.settings.sendToParty ? '真实组队'.clr('56B4E9') : '仅自己见'.clr('E69F00')));
					command.message('职业分类 ' + (isTank ? '坦克'.clr('00FFFF') : '打手'.clr('FF0000')));
					sendMessage('test');
					break;
				default :
					command.message('无效的参数!'.clr('FF0000'));
					break;
			}
		}
	});

	mod.game.on('enter_game', () => {
		let job = (mod.game.me.templateId - 10101) % 100;
		if (job === 1 || job === 10) {					// 0-双刀, 1-枪骑, 2-大剑, 3-斧头, 4-魔道
			isTank = true;								// 5-弓箭, 6-祭司, 7-元素, 8-飞镰, 9-魔工
		} else {										// 10-拳师, 11-忍者 12 月光
			isTank = false;
		}
	})

	mod.game.me.on('change_zone', (zone, quick) => {
		if (zone === MapID[0]) {
			insidemap = true;
			command.message('进入副本: ' + '里安的地下殿堂 '.clr('56B4E9') + '[下级]'.clr('E69F00'));
			load();
		} else if (zone === MapID[1]) {
			insidemap = true;
			command.message('进入副本: ' + '里安的地下殿堂 '.clr('56B4E9') + '[上级]'.clr('00FFFF'));
			load();
		} else if (zone === MapID[2]) {
			insidemap = true;
			command.message('进入副本: ' + '里安的地下殿堂 '.clr('56B4E9') + '[7人]'.clr('FF0000'));
			load();
		} else {
			unload();
		}
	})
	// 加载 获取信息
	function load() {
		if (!hooks.length) {
			hook('S_BOSS_GAGE_INFO', 3, sBossGageInfo);		// 获取 大型怪物血量信息
			hook('S_ACTION_STAGE', 9, sActionStage);		// 获取 周围全部[攻击动作]事件
			
		}
	}
	// 挂钩 获取信息
	function hook() {
		hooks.push(mod.hook(...arguments));
	}
	// BOSS信息
	function sBossGageInfo(event) {
		if (!insidemap) return;

		let bosshp = (Number(event.curHp) / Number(event.maxHp));

		if (bosshp <= 0) {
			whichboss = 0;
		}

		if (bosshp === 1) {
			power = false,
			Level = 0,
			levelMsg = [],
			powerMsg = '';
		}

		if (event.huntingZoneId == HuntingZn[0]) {
			insidezone = true;
			whichmode = 1;
		} else if (event.huntingZoneId == HuntingZn[1]) {
			insidezone = true;
			whichmode = 2;
		} else if (event.huntingZoneId == HuntingZn[2]) {
			insidezone = true;
			whichmode = 3;
		} else {
			insidezone = false;
			whichmode = 0;
		}

		if (event.templateId == BossID[0]) whichboss = 1;
		else if (event.templateId == BossID[1]) whichboss = 2;
		else if (event.templateId == BossID[2]) whichboss = 3;
		else whichboss = 0;
	}
	// BOSS技能
	function sActionStage(event) {
		// 模块关闭 或 不在副本中 或 找不到BOSS血条
		if (!mod.settings.enabled || !insidezone || whichboss==0) return;

		// 2王石碑 水波攻击 范围提示
		if (whichboss==2 && (event.templateId==2021 || event.templateId==2022 || event.templateId==2023)) {
			let sign_skillid = event.skill.id % 1000;								// 石碑攻击技能编号简化
			sign_CurLocation = event.loc;											// 石碑的 x y z 坐标
			sign_CurAngle = event.w;												// 石碑的角度

			let	sign_X = sign_CurLocation.x - boss_CurLocation.x,					// 石碑与王 X坐标之差
				sign_Y = sign_CurLocation.y - boss_CurLocation.y,					// 石碑与王 Y坐标之差
				sign_Radius = Math.pow((sign_X*sign_X) + (sign_Y*sign_Y), 0.5);		// 勾股定理: C等于(A平方+B平方)的1/2次幂

			curLocation = sign_CurLocation;											// 传递石碑坐标参数
			curAngle = sign_CurAngle;												// 传递石碑角度参数

			if (sign_skillid === 302 || sign_skillid === 306 || sign_skillid === 303 || sign_skillid === 307) {
				Spawnitem2(413, 6, sign_Radius, 7000);								// 构造圆形花圈 石碑到王的距离为 [半径]
			}
		}

		// 3王 接电石碑 队员间隔
		if (whichboss==3 && event.templateId==3022 && event.skill.id==1101) {
			// 3王回地图中间点的 (x, y) 坐标
			boss_CurLocation.x = -95703;
			boss_CurLocation.y = 144980;
			// 上级HP<40% 较短一侧石碑到王 提示跳过
			let X = Math.pow((boss_CurLocation.x - event.loc.x), 2),
				Y = Math.pow((boss_CurLocation.y - event.loc.y), 2),
				C = Math.pow(X+Y, 0.5);
			if (C < 500) return;

			// 石碑的坐标/角度 设定为提示物初始点
			curLocation = event.loc;
			curAngle = event.w;

			Spawnitem2(445, 15, 105, 8000);
			Spawnitem2(445, 12, 210, 8000);
			Spawnitem2(445, 10, 315, 8000);
			Spawnitem2(445, 8, 420, 8000);

			Spawnitem1(912, 180, 440, 8000);
		}

		// 攻击技能 不是[1王] 也不是 [2王] 也不是 [3王] , 函数到此结束 (屏蔽 玩家/队友/NPC/召唤生物 攻击技能)
		if (event.templateId!=BossID[0] && event.templateId!=BossID[1] && event.templateId!=BossID[2]) return;

		let skillid = event.skill.id % 1000;		// 攻击技能编号简化 取1000余数运算
		boss_CurLocation = event.loc;				// BOSS的 x y z 坐标
		boss_CurAngle = event.w;					// BOSS的角度

		curLocation = boss_CurLocation;				// 传递BOSS坐标参数
		curAngle = boss_CurAngle;					// 传递BOSS角度参数

		let bossSkillID;
		if (whichboss==1 && (bossSkillID = mod.settings.FirstBossActions.find(obj => obj.id === skillid))) {
			if (!isTank && skillid === 106) return;												// 打手职业 不提示的技能
			if ( isTank && (skillid === 107 || skillid === 108 || skillid === 307)) return;		// 坦克职业 不提示的技能
			sendMessage(bossSkillID.msg);
		}

		if (whichboss==2 && (bossSkillID = mod.settings.SecondBossActions.find(obj => obj.id === skillid))) {
			// 2王 内外圈
			if (skillid === 301) {	// 捶地+旋转
				Spawnitem2(445, 8, 260, 5000);		// 中心圈
				Spawnitem2(445, 6, 560, 5000);
			}
			if (skillid === 302) {	// 旋转+捶地
				Spawnitem2(445, 8, 260, 5000);		// 中心圈
				Spawnitem2(445, 6, 680, 5000);
			}
			if (skillid === 114) {	// 三连拍
				Spawnitem2(445, 8, 260, 5000);		// 中心圈
				Spawnitem2(445, 6, 560, 5000);
			}

			// 2王 前砸后砸 横向对称轴
			if (skillid === 116) {
				Spawnitem1(445, 270, 500, 5000);	// 左侧直线花朵
				Spawnitem1(445, 90, 500, 5000);		// 右侧直线花朵
			}

			sendMessage(bossSkillID.msg);
		}

		if (whichboss==3 && (bossSkillID = mod.settings.ThirdBossActions.find(obj => obj.id === skillid))) {
			// 蓄电层数计数
			if (whichmode==2) {
				if (skillid===300) Level = 0, levelMsg = bossSkillID.level_Msg, power = true;	// 一次觉醒 开始充能计数
				if (skillid===360) Level = 0;													// 放电爆炸 重置充能计数
				if (skillid===399) Level = 0, levelMsg = bossSkillID.level_Msg;					// 二次觉醒 重置充能计数

				if (power) {		// 充能开关打开 并且 施放以下技能 则增加一层
					switch (skillid) {
						case 118:	// 三连击

						case 143:	// 左后
						case 145:	// 左后

						case 146:	// 左后 (扩散)
						case 154:	// 左后 (扩散)

						case 144:	// 右后
						case 147:	// 右后

						case 148:	// 右后 (扩散)
						case 155:	// 右后 (扩散)

						case 161:	// (后砸) (前砸)
						case 162:	// (后砸) (前砸)

						case 213:	// 尾巴
						case 215:	// 尾巴
							powerMsg = ' | ' + levelMsg[Level];
							Level++;
							break;
						default :
							powerMsg = '';
							break;
					}
				}
				// 屏蔽[三连击]技能连续触发充能
				if (power && (skillid===118)) {
					power = false;
					setTimeout(function() { power = true }, 4000);
				}
			}

			// 3王 左右扩散电圈位置标记
			if (skillid === 146 || skillid === 154 || skillid === 148 || skillid === 155) {
				SpawnThing(bossSkillID.sign_degrees, bossSkillID.sign_distance, 8000);	// 中心点告示牌标记 持续8秒

				setTimeout(function() {	// 花圈范围 延迟2.5秒出现 持续5.5秒
					Spawnitem2(445, 15, 160, 5500);
					Spawnitem2(445, 12, 320, 5500);
					Spawnitem2(445, 10, 480, 5500);
					Spawnitem2(445, 8, 640, 5500);
					Spawnitem2(445, 6, 800, 5500);
				}, 2500);
			}

			// 3王 飞天半屏攻击
			if (skillid === 139 || skillid === 150 || skillid === 141 || skillid === 152) {
				Spawnitem1(445, 180, 500, 5000);	// 垂直对称轴 头部
				Spawnitem1(445, 0, 225, 5000);		// 垂直对称轴 尾部

				Spawnitem(513, 0, 250, 5000);		// 垂直对称轴 尾部特殊标记
				Spawnitem(513, 0, 350, 5000);
				Spawnitem(513, 0, 450, 5000);

				SpawnThing(bossSkillID.sign_degrees, bossSkillID.sign_distance, 2000);	// 光柱+告示牌
			}

			sendMessage(bossSkillID.msg + powerMsg);
		}
	}
	// 卸载 获取信息
	function unload() {
		if (hooks.length) {
			for (let h of hooks)
				mod.unhook(h);
			hooks = [];
		}
		reset();
	}
	// 重置数据配置
	function reset() {
		insidemap = false,
		insidezone = false,
		whichmode = 0,
		whichboss = 0,

		power = false,
		Level = 0,
		levelMsg = [],
		powerMsg = '';
	}
	// 发送提示文字
	function sendMessage(msg) {
		if (mod.settings.sendToParty) {
			mod.send('C_CHAT', 1, {
				channel: 21, //21 = p-notice, 1 = party, 2 = guild, 25 = r-notice
				message: msg
			});
		} else if (mod.settings.sendToStream) {
			command.message(msg);
		} else {
			mod.send('S_CHAT', 2, {
				channel: 21, //21 = 队长通知, 1 = 组队, 2 = 公会, 25 = 团长通知
				authorName: '殿堂',
				message: msg
			});
		}
	}
	// 地面提示(光柱+告示牌)
	function SpawnThing(degrees, radius, times) { // 偏移角度 半径距离 持续时间
		let r = null, rads = null, finalrad = null;

		r = curAngle - Math.PI;
		rads = (degrees * Math.PI/180);
		finalrad = r - rads;
		curLocation.x = boss_CurLocation.x + radius * Math.cos(finalrad);
		curLocation.y = boss_CurLocation.y + radius * Math.sin(finalrad);

		// 告示牌
		mod.send('S_SPAWN_BUILD_OBJECT', 2, {
			gameId : uid1,
			itemId : 1,
			loc : curLocation,
			w : r,
			unk : 0,
			ownerName : '提示',
			message : '安全区'
		});

		// 龙头光柱
		curLocation.z = curLocation.z - 1000;
		mod.send('S_SPAWN_DROPITEM', 7, {
			gameId: uid2,
			item: 98260, // 98260-古龙贝勒古斯的头
			loc: curLocation,
			amount: 1,
			expiry: 600000,
			owners: [{
				id: 0
			}]
		});
		curLocation.z = curLocation.z + 1000;

		// 延迟消除
		setTimeout(DespawnThing, times, uid1, uid2);
		uid1--;
		uid2--;
	}
	// 消除 光柱+告示牌
	function DespawnThing(uid_arg1, uid_arg2) {
		mod.send('S_DESPAWN_BUILD_OBJECT', 2, {
			gameId : uid_arg1,
			unk : 0
		});
		mod.send('S_DESPAWN_DROPITEM', 4, {
			gameId: uid_arg2
		});
	}
	//地面提示(花朵)
	function Spawnitem(item, degrees, radius, times) { // 显示物品 偏移角度 半径距离 持续时间
		let r = null, rads = null, finalrad = null, spawnx = null, spawny = null, pos = null;

		r = curAngle - Math.PI;
		rads = (degrees * Math.PI/180);
		finalrad = r - rads;
		spawnx = curLocation.x + radius * Math.cos(finalrad);
		spawny = curLocation.y + radius * Math.sin(finalrad);
		pos = {x:spawnx, y:spawny};
		// 花朵
		mod.send('S_SPAWN_COLLECTION', 4, {
			gameId : uid0,
			id : item,
			amount : 1,
			loc : new Vec3(pos.x, pos.y, curLocation.z),
			w : r,
			unk1 : 0,
			unk2 : 0
		});
		// 延时消除
		setTimeout(Despawn, times, uid0);
		uid0--;
	}
	// 消除花朵
	function Despawn(uid_arg0) {
		mod.send('S_DESPAWN_COLLECTION', 2, {
			gameId : uid_arg0
		});
	}
	// 构造直线花朵
	function Spawnitem1(item, degrees, maxRadius, times) {  // 显示物品 偏移角度 最远距离 持续时间
		for (var radius=50; radius<=maxRadius; radius+=50) { // 距离间隔 50
			Spawnitem(item, degrees, radius, times); // 显示物品 偏移角度 半径距离 持续时间
		}
	}
	// 构造圆形花圈
	function Spawnitem2(item, intervalDegrees, radius, times) { // 显示物品 偏移间隔 半径距离 持续时间
		for (var degrees=0; degrees<360; degrees+=intervalDegrees) {
			Spawnitem(item, degrees, radius, times); // 显示物品 偏移角度 半径距离 持续时间
		}
	}
	
}

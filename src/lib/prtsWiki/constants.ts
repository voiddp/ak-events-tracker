export const pageNames = {
    events: '活动一览',
    operations: '关卡一览/常态事务',
    all_sss: "保全派驻",
    integratedStrategyList: '模板:集成战略导航',
    IS_navbox: '模板:Navbox_集成战略',
    reclamationAlgorithmList: '模板:生息演算导航',
    //tides of war
    reclamationAlgorithmTides: '战争浪潮'
    //critical contentions
};

export const templates = {
    anihilations: '剿灭作战',
    sss: '保全派驻/Ver2',
    sideStory: '活动信息',
    itemLeveReward: '关卡报酬',
    itemIcon: '道具图标',
};

export const argNames = {
    sssMission: '派驻周期名',
    sssEndDate: '派驻周期刷新时间',
    sssTitle: '派驻周期任务',
    aniPrefix: '委托',
    curAniPrefix: '轮换委托',
    curAniDate: `结束时间`,
    link: `link=`,
    themeUpdateHistory: '主题更新记录',
    totals: '报酬合计',
    paidPackContent: '组合包内容',
    raTideRewards: '击破奖励',
};

//order matters, each next found word is placed at start
export const dictionary = {
    '签到': 'Sign-in',
    event: '活动',
    '复刻': 'Rerun',
    'IN RETROSPECT': 'Rerun',
    'In Retrospect': 'Rerun',
    '限时任务': 'Missions',
    '集成': 'IS',
    '跨年': 'New Year',
    '促融共竞': `Icebreaker Games`,
};

export const containers: Record<string, string> = {
    '模组数据整合箱': 'moduleBox',
    '模组数据整合块': 'moduleChunk',
    '先锋芯片组印刻仪': 'vanguardPackEtcher',
    '近卫芯片组印刻仪': 'guardPackEtcher',
    '重装芯片组印刻仪': 'defenderPackEtcher',
    '狙击芯片组印刻仪': 'sniperPackEtcher',
    '术师芯片组印刻仪': 'casterPackEtcher',
    '医疗芯片组印刻仪': 'medicPackEtcher',
    '辅助芯片组印刻仪': 'supportPackEtcher',
    '特种芯片组印刻仪': 'specialistPackEtcher',
}

export const containersContent: Record<string, Record<string, number>> = {
    moduleBox: {
        'mod_unlock_token': 12,
        'mod_update_token_1': 60,
        'mod_update_token_2': 20,
    },
    moduleChunk: {
        'mod_unlock_token': 3,
        'mod_update_token_1': 15,
        'mod_update_token_2': 5,
    },
    vanguardPackEtcher: { '3211': 5, '3212': 8 },
    guardPackEtcher: { '3221': 5, '3222': 8 },
    defenderPackEtcher: { '3231': 5, '3232': 8 },
    sniperPackEtcher: { '3241': 5, '3242': 8 },
    casterPackEtcher: { '3251': 5, '3252': 8 },
    medicPackEtcher: { '3261': 5, '3262': 8 },
    supportPackEtcher: { '3271': 5, '3272': 8 },
    specialistPackEtcher: { '3281': 5, '3282': 8 },

    sssModuleFirstTime: {
        'mod_unlock_token': 10,
        'mod_update_token_1': 60,
        'mod_update_token_2': 20,
    },
};


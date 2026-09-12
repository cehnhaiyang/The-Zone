/**
 * 起源模板 - 游戏开局选项
 * 
 * 每个起源定义了一条独立的故事线入口，包含：
 * - 主角的职业与身份背景
 * - 初始庇护所（安全区）
 * - 初始同伴（如有）
 * - 难度标注（影响资源稀缺和遭遇频率）
 * 
 * 设计原则：三条起源线暗示同一世界的不同视角，
 * 但不在开局文本中过度揭示——让玩家在游戏中自行发现关联。
 */

import { OriginTemplate } from '../meta';
import { ZONE_HOSPITAL, ZONE_BUNKER, ZONE_ARCHIVE } from './sanctuary';
import { PLAYER_OCCULTIST, COMPANION_GUARDIAN, PLAYER_VETERAN, PLAYER_INVESTIGATOR, } from './character';

export const ORIGIN_TEMPLATES: OriginTemplate[] = [
    {
        /**
         * 起源A：医院线
         * 叙事定位：生存悬疑 / 人性挣扎
         * 核心冲突：在封闭空间中维持秩序，同时调查医院的真相
         */
        id: 'origin_hospital',
        title: '零号病房',
        desc: '三天的记忆空白。你醒来时，发现自己正站在圣伊丽莎白医院那扇锈迹斑斑的气密门前，手里攥着一把弹巢空了四发的左轮。护士长收留了你——但这里的「病人」似乎并不全是人类，而那些被封死的病房门后，总有什么东西在敲击。',
        player: PLAYER_INVESTIGATOR,
        sanctuary: ZONE_HOSPITAL
    },
    {
        /**
         * 起源B：军事线
         * 叙事定位：末世军事 / PTSD 与救赎
         * 核心冲突：以暴力开路，同时对抗内心的战争创伤
         * 同伴：守护者 Unit-734（防御型坦克，初始信任需要时间建立）
         * 难度：困难 — 虽有坦克同伴，但起始区域威胁更高、资源更少
         */
        id: 'origin_bunker',
        title: '铁锈前哨',
        desc: '战争结束了，但前线没有。你的小队在代号「黑仪式」的行动中全军覆没——除了你，和一台记忆损坏的半机械守护者 Unit-734。你们退守到这个废弃的军事前哨，用铁丝网和弹药箱筑起了最后的防线。外面的东西不再是人类，但你的战壕刀不介意。',
        player: PLAYER_VETERAN,
        companion: [COMPANION_GUARDIAN],
        sanctuary: ZONE_BUNKER
    },
    {
        /**
         * 起源C：神秘学线
         * 叙事定位：宇宙恐怖 / 疯狂与真理
         * 核心冲突：在追求禁忌知识的路上验证自己是先知还是疯子
         * 同伴：无 — 独行的代价，也是疯狂的自由
         * 难度：简单 — 无同伴但起始区域威胁最低、有强力爆发卡组
         */
        id: 'origin_archive',
        title: '烛火书斋',
        desc: '你追踪着一本会呼吸的书来到了这里。这间藏匿于地下的书斋收藏了太多不该被凡人阅读的知识——而你的右手，那只被寄生真菌「复活」的右手，正不由自主地翻开了最深处书架上那本人皮封面的典籍。没有同伴，没有退路。真理在等待，但代价已经开始计算。',
        player: PLAYER_OCCULTIST,
        sanctuary: ZONE_ARCHIVE
    }
];

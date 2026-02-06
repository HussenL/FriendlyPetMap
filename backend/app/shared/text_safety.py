from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

_whitespace = re.compile(r"\s+")

# URL
_url = re.compile(r"(https?://|www\.)\S+", re.IGNORECASE)

# 中国手机号（粗略）
_phone_cn = re.compile(r"(?<!\d)(?:1[3-9]\d{9})(?!\d)")

# ========= 联系方式 / 引流（加强版） =========
# 说明：为了防绕过，允许中间夹杂空格、符号、全角符号、点、下划线等
_sep = r"[\s\-\_·\.\,，。:：|/\\~`!@#$%^&*()\[\]{}<>“”\"'＋+＝=]*"

# 1) 微信相关关键词（含常见同音/变体/拆字）
# - 微信 / 微 信 / 薇信 / 威信 / wechat / weixin / wx / vx / v信 / vX 等
_wechat_kw = re.compile(
    rf"(微{_sep}信|薇{_sep}信|威{_sep}信|维{_sep}信|v{_sep}信|w{_sep}x|v{_sep}x|we{_sep}chat|wei{_sep}xin)",
    re.IGNORECASE,
)

# 2) “加我/加V/加vx/私信/联系”等引导词（增加命中率）
_cta_kw = re.compile(
    rf"(加{_sep}我|加{_sep}v|加{_sep}V|私{_sep}信|联{_sep}系|来{_sep}聊|找{_sep}我)",
    re.IGNORECASE,
)

# 3) 微信号本体形态（4~20 位，字母开头更像微信号；允许包含下划线/减号）
# 这里会在“微信关键词附近”或“CTA附近”才触发，减少误伤。
_wechat_id = re.compile(r"[a-zA-Z][a-zA-Z0-9_-]{3,19}")

# 4) 兜底：出现“VX/WX/微信”等关键词后，若后面 0~12 字符内出现可疑 ID 或数字串，就拦
# 数字串用于抓 “vx: 1234567” 这类（即使不是标准微信号也属于引流）
_suspicious_id_or_digits = re.compile(r"(?:[a-zA-Z][a-zA-Z0-9_-]{3,19}|[1-9]\d{4,11})")

# ========= 明显威胁（保留你要求：不误伤描述投毒点） =========
_intent = r"(我(要|会|准备|打算)|去|来|带人|叫人|今晚|明天|等我|给你|必须|应该|一起)"
_target = r"(你|他|她|TA|某人|人|店|店家|老板|物业|邻居|小区|学校|公司)"
_violence_verb = r"(杀|弄死|砍|捅|打死|烧|炸|放火|下毒|投毒)"
_threat = re.compile(_intent + r".{0,12}" + _violence_verb + r".{0,12}" + _target, re.IGNORECASE)


@dataclass
class CleanResult:
    ok: bool
    cleaned: str
    reason: Optional[str] = None


def _normalize_basic(s: str) -> str:
    s = s.strip()
    s = _whitespace.sub(" ", s)
    return s


def _has_contact_or_ad(s: str) -> bool:
    # URL / 手机号：直接拦
    if _url.search(s) or _phone_cn.search(s):
        return True

    # 微信关键词命中：看关键词后附近是否跟了 ID 或数字串（防 “wx 123456” “微信：abc_123”）
    m = _wechat_kw.search(s)
    if m:
        tail = s[m.end() : m.end() + 40]  # 只看后面一小段，降低误伤
        if _suspicious_id_or_digits.search(tail):
            return True

    # CTA 命中：如果同时出现疑似微信关键词 or 疑似ID，也拦（防 “加我 abc1234”）
    if _cta_kw.search(s):
        # 如果直接出现 wechat 关键词或 ID 形态，也认为是引流
        if _wechat_kw.search(s) or _wechat_id.search(s):
            return True

    # 额外兜底：出现 “vx/wx” 这类非常短的关键词，即使没有明显分隔，也尝试抓
    # （例如：vxabc123 / wx_abc123）
    if re.search(r"\b(?:vx|wx)\b", s, re.IGNORECASE):
        if _wechat_id.search(s):
            return True

    return False


def validate_text(
    s: str,
    *,
    min_len: int,
    max_len: int,
    check_contact: bool = True,
    check_threat: bool = True,
) -> CleanResult:
    if s is None:
        return CleanResult(False, "", "EMPTY")

    s = _normalize_basic(s)

    if len(s) < min_len:
        return CleanResult(False, s, "TOO_SHORT")
    if len(s) > max_len:
        # 加重处理：直接拒绝
        return CleanResult(False, s, "TOO_LONG")

    if check_contact:
        if _has_contact_or_ad(s):
            return CleanResult(False, s, "CONTACT_OR_AD_NOT_ALLOWED")

    if check_threat:
        # 不会因为“毒/毒死/杀死”等单词本身就拦
        if _threat.search(s):
            return CleanResult(False, s, "VIOLENT_THREAT")

    return CleanResult(True, s, None)

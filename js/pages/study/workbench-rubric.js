(function () {
  function evaluateCapstoneRubric(part1, part2) {
    const text1 = part1.toLowerCase();
    const text2 = part2.toLowerCase();
    let score = 0;
    const missing = [];

    // Check Part 1: Verse 2:38
    if (/2:38|two:thirty-eight|dan(iel)?\s*2/i.test(text1) || /thou art|head of gold/i.test(text1)) {
      score += 25;
    } else {
      missing.push("• Part 1: Cite Daniel 2:38 or 'thou art this head of gold' as the unchangeable biblical anchor.");
    }

    // Check Part 1: Contiguous succession / no restarts
    if (/contigu(ous)?|success(ion)?|unbroken|chain|order|no (restart|gap|reset)/i.test(text1)) {
      score += 25;
    } else {
      missing.push("• Part 1: Explain that the succession is contiguous (the metals never restart or cycle).");
    }

    // Check Part 1: Feet / divided / stone
    if (/feet|clay|divid(ed)?|stone|rome/i.test(text1)) {
      score += 25;
    } else {
      missing.push("• Part 1: Locate our modern era in the divided feet of iron/clay awaiting the supernatural Stone.");
    }

    // Check Part 2: Consecration precedes revelation
    if (/consecrat(ion)?|loyal(ty)?|defil(e)?|faith(ful)?|table|diet|purpos(e)?|covenant/i.test(text2)) {
      score += 25;
    } else {
      missing.push("• Part 2: Explain that moral consecration at the king's table precedes prophetic illumination.");
    }

    return {
      passed: score >= 75,
      score: score,
      missing: missing,
      part1: part1,
      part2: part2,
      timestamp: new Date().toISOString()
    };
  }

  window.WorkbenchRubric = Object.freeze({ evaluateCapstoneRubric });
})();

# tradeoff-analyzer

## name

Tradeoff Analyzer

## description

Analyzes tradeoffs between competing solutions, priorities, or architectural decisions. This skill helps make informed decisions by understanding the true cost of each choice.

**When to use this skill:**
- When comparing competing solutions
- When balancing competing priorities (speed vs quality)
- During architectural decisions
- When resolving team disagreements
- Before making irreversible decisions
- When evaluating build vs buy decisions

## instructions

1. **Define the Decision**
   - What are we deciding?
   - What are the options?
   - What's the timeframe for this decision?

2. **Identify Stakeholders**
   - Who is affected by this decision?
   - Who has input in the decision?
   - Who will implement it?

3. **Define Evaluation Criteria**
   - What factors matter most?
   - Common criteria:
     - Time to market
     - Cost
     - Quality
     - Maintainability
     - Scalability
     - Security
     - Team experience
     - Technical debt

4. **Analyze Each Option**
   For each option, assess:
   - Benefits (what you gain)
   - Costs (what you give up)
   - Risks
   - Hidden implications

5. **Quantify When Possible**
   - Estimate hours/days for each option
   - Estimate cost if applicable
   - Estimate technical debt impact

6. **Map Tradeoffs**
   - Does option A give you X at cost of Y?
   - Is option B the opposite?
   - Can you combine elements?

7. **Identify Win-Win Opportunities**
   - Can you partially satisfy both options?
   - Is there a third option that minimizes downsides?

8. **Make a Recommendation**
   - Based on weighted criteria
   - Considering organizational context
   - With clear reasoning

## expected input

- A decision to be made
- Competing options or priorities
- Optional: stakeholder concerns
- Optional: organizational constraints

## expected output

A tradeoff analysis document containing:
- Decision statement
- Evaluation criteria (with weights)
- Analysis of each option
- Tradeoff mapping
- Win-win possibilities
- Recommendation with rationale

## example usage

```
User: We need to decide between writing a custom component library vs using a UI framework like Material UI for our React app. Help us understand the tradeoffs.

[Using tradeoff-analyzer]

Output:
# Tradeoff Analysis: Custom Component Library vs Material UI

## Decision Statement
Choose between building a custom component library or adopting Material UI for our React application.

## Evaluation Criteria (Weighted by Priority)

| Criteria | Weight | Why It Matters |
|----------|--------|----------------|
| Time to Market | 30% | Launch deadline in 3 months |
| Consistency | 25% | Multiple developers, need unified look |
| Customization | 20% | Brand requirements |
| Maintainability | 15% | Long-term cost |
| Learning Curve | 10% | Team ramp-up time |

---

## Option A: Custom Component Library

### Summary
Build and maintain our own component library from scratch.

### What You Gain
- Complete control over design and behavior
- No external dependencies
- Optimized bundle size (only ship what you use)
- Can evolve exactly with brand needs
- No licensing or vendor concerns

### What You Give Up
- Significant development time upfront
- Must reinvent common patterns
- Testing burden falls on us
- Accessibility features must be built manually
- Ongoing maintenance responsibility

### Costs
- **Time**: 6-8 weeks for MVP library
- **Money**: Developer time only (~$30k opportunity cost)
- **Technical Debt**: Low (we own the code)

### Risks
- Scope creep in components
- Inconsistent implementation if not careful
- Accessibility might be an afterthought
- Team burnout from building "base" work

---

## Option B: Material UI

### Summary
Use Material UI as the foundation, customized to match brand.

### What You Gain
- Fast to get started (days, not weeks)
- Battle-tested components
- Built-in accessibility
- Large community and documentation
- Regular updates and security patches

### What You Give Up
- Design constraints (Material Design patterns)
- Some bundle bloat (entire library)
- Dependency on third party
- Customization requires overriding styles
- May not match brand exactly

### Costs
- **Time**: 1-2 weeks to implement
- **Money**: Free (MIT license), potential for MUI X Pro later
- **Technical Debt**: Medium (external dependency)

### Risks
- Material Design look and feel leaks through
- Breaking changes in major versions
- Limited customization flexibility
- Vendor lock-in concerns

---

## Tradeoff Mapping

```
                    Time to Market
                         ↑
                         |
    Custom UI            |        Material UI
    (Longer)             |        (Faster)
         ←───────────────┼──────────────→
                         |
    Brand Fit            |        Consistency
    (Perfect)            |        (Good)
                         |
                         ↓
                    Customization
```

**Key Insight**: Custom UI gives you control at the cost of time. Material UI gives you speed at the cost of perfect brand fit.

---

## Hybrid Option (Win-Win)

**Approach**: Start with Material UI, create "wrapper" components.

```jsx
// Create brand wrappers
const BrandButton = ({ children, variant, ...props }) => (
  <MUIButton 
    variant={variant}
    sx={{ 
      borderRadius: 2,
      textTransform: 'none',
      fontWeight: 600,
      /* Brand-specific overrides */
      ...props.sx 
    }}
    {...props}
  >
    {children}
  </MUIButton>
);

// Export only what you need
export { BrandButton, BrandCard, BrandTextField } from './components';
```

**Benefits**:
- Get started in 1 week
- Can swap Material UI later if needed
- Brand consistency through wrappers
- Reduced long-term coupling

---

## Analysis Summary

| Criteria | Custom | Material UI | Hybrid |
|----------|--------|-------------|--------|
| Time to Market | 0/10 | 8/10 | 7/10 |
| Consistency | 10/10 | 6/10 | 8/10 |
| Customization | 10/10 | 5/10 | 7/10 |
| Maintainability | 7/10 | 9/10 | 8/10 |
| Learning Curve | 6/10 | 7/10 | 7/10 |
| **Weighted Total** | **6.7** | **7.3** | **7.5** |

*Scores: 10 = best, 0 = worst*

---

## Recommendation

**Recommended: Hybrid Approach**

**Rationale**:
1. **Meets deadline**: 1-2 weeks vs 6-8 weeks
2. **Reduces lock-in**: Wrapper pattern means Material UI is replaceable
3. **Balances control and speed**: Get most benefits of both
4. **Future flexibility**: Can extract to custom library incrementally

**Implementation Plan**:
1. Week 1: Set up MUI + create wrapper components for 5 core components
2. Week 2: Implement main features using wrappers
3. Ongoing: Replace wrappers with custom components where MUI is limiting

**When to Reconsider**:
- If brand requirements are non-negotiable and can't be achieved with MUI customization
- If the project is a long-term product (5+ years), investment in custom library may pay off
- If team has excess capacity and wants to reduce dependencies
```

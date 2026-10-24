from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'client', 'public', 'resources', 'g3b-sample-assessment-report.pdf')
FONT = os.path.join(ROOT, 'client', 'public', 'fonts', 'plus-jakarta-sans-latin-variable.woff2')
try:
    pdfmetrics.registerFont(TTFont('G3B', FONT))
    FAMILY = 'G3B'
except Exception:
    FAMILY = 'Helvetica'

NAVY = colors.HexColor('#0B2C5F')
ORANGE = colors.HexColor('#F47B35')
INK = colors.HexColor('#28384D')
MUTED = colors.HexColor('#66758A')
PALE = colors.HexColor('#F3F6F9')
LINE = colors.HexColor('#D9E1E9')

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='Kicker', fontName=FAMILY, fontSize=8, leading=11, textColor=ORANGE, spaceAfter=7, tracking=1.2))
styles.add(ParagraphStyle(name='TitleG3B', fontName=FAMILY, fontSize=27, leading=32, textColor=NAVY, spaceAfter=12))
styles.add(ParagraphStyle(name='Deck', fontName=FAMILY, fontSize=10.5, leading=17, textColor=MUTED, spaceAfter=16))
styles.add(ParagraphStyle(name='H2G3B', fontName=FAMILY, fontSize=16, leading=21, textColor=NAVY, spaceBefore=8, spaceAfter=10))
styles.add(ParagraphStyle(name='H3G3B', fontName=FAMILY, fontSize=10.5, leading=14, textColor=NAVY, spaceAfter=4))
styles.add(ParagraphStyle(name='BodyG3B', fontName=FAMILY, fontSize=9.2, leading=15, textColor=INK, spaceAfter=8))
styles.add(ParagraphStyle(name='SmallG3B', fontName=FAMILY, fontSize=7.5, leading=11, textColor=MUTED))

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE); canvas.line(20*mm, 14*mm, 190*mm, 14*mm)
    canvas.setFont(FAMILY, 7); canvas.setFillColor(MUTED)
    canvas.drawString(20*mm, 9*mm, 'G3B Education - Fictional sample report for demonstration only')
    canvas.drawRightString(190*mm, 9*mm, f'Page {doc.page}')
    canvas.restoreState()

def build():
    doc = SimpleDocTemplate(OUT, pagesize=A4, leftMargin=20*mm, rightMargin=20*mm, topMargin=22*mm, bottomMargin=22*mm)
    story = []

    story.append(Paragraph('SAMPLE REPORT / FICTIONAL DATA', styles['Kicker']))
    story.append(Paragraph('Student Direction Profile', styles['TitleG3B']))
    story.append(Paragraph(
        'A demonstration of how assessment themes may be organised for a guided conversation. This is not a real student report, diagnosis, prediction, or validated assessment result.',
        styles['Deck']
    ))

    # Callout banner
    callout = Table([
        [Paragraph('<b>Important</b><br/>All names, scores and recommendations in this document are fictional. Actual G3B reports depend on the authorized instrument used and professional interpretation.', styles['BodyG3B'])]
    ], colWidths=[170*mm])
    callout.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FFF9F5')),
        ('BOX', (0,0), (-1,-1), 1, ORANGE),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(callout)
    story.append(Spacer(1, 14*mm))

    story.append(Paragraph('Profile overview', styles['H2G3B']))
    overview_data = [
        [Paragraph('Sample learner', styles['SmallG3B']), Paragraph('Aarav Mehta (fictional)', styles['BodyG3B'])],
        [Paragraph('Current stage', styles['SmallG3B']), Paragraph('Exploring subject choices', styles['BodyG3B'])],
        [Paragraph('Purpose', styles['SmallG3B']), Paragraph('Discuss strengths, interests and areas for further exploration', styles['BodyG3B'])],
        [Paragraph('Interpretation', styles['SmallG3B']), Paragraph('Guided review with a counsellor', styles['BodyG3B'])],
    ]
    t = Table(overview_data, colWidths=[40*mm, 130*mm])
    t.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 0.5, LINE),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 12*mm))

    story.append(Paragraph('Illustrative aptitude pattern', styles['H2G3B']))
    story.append(Paragraph('The values below demonstrate presentation only. They are not norms, percentiles, or results from a real instrument.', styles['Deck']))
    aptitude_data = [
        [Paragraph('<b>Area</b>', styles['SmallG3B']), Paragraph('<b>Illustrative indicator</b>', styles['SmallG3B']), Paragraph('<b>Conversation prompt</b>', styles['SmallG3B'])],
        [Paragraph('Verbal reasoning', styles['BodyG3B']), Paragraph('Developing strength', styles['BodyG3B']), Paragraph('Which reading and explanation tasks feel most engaging?', styles['BodyG3B'])],
        [Paragraph('Numerical reasoning', styles['BodyG3B']), Paragraph('Balanced', styles['BodyG3B']), Paragraph('What changes when a problem is presented visually?', styles['BodyG3B'])],
        [Paragraph('Logical reasoning', styles['BodyG3B']), Paragraph('Emerging strength', styles['BodyG3B']), Paragraph('Which puzzles or systems hold attention longest?', styles['BodyG3B'])],
        [Paragraph('Spatial reasoning', styles['BodyG3B']), Paragraph('Explore further', styles['BodyG3B']), Paragraph('Would a supervised practical task add useful evidence?', styles['BodyG3B'])],
    ]
    t2 = Table(aptitude_data, colWidths=[42*mm, 42*mm, 86*mm])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, LINE),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t2)

    story.append(PageBreak())

    # Page 2
    story.append(Paragraph('INTERESTS & LEARNING PREFERENCES', styles['Kicker']))
    story.append(Paragraph('Themes to discuss, not labels to accept', styles['TitleG3B']))

    pref_data = [
        [Paragraph('Curiosity through projects', styles['H3G3B']), Paragraph('The fictional learner reports stronger engagement when ideas lead to a visible output or experiment.', styles['BodyG3B'])],
        [Paragraph('Collaborative explanation', styles['H3G3B']), Paragraph('Discussing a concept with peers may help reveal understanding and unanswered questions.', styles['BodyG3B'])],
        [Paragraph('Structured independence', styles['H3G3B']), Paragraph('Clear milestones appear helpful while leaving room to choose the approach.', styles['BodyG3B'])],
        [Paragraph('Reflection before decisions', styles['H3G3B']), Paragraph('A short comparison framework may improve confidence when several options seem attractive.', styles['BodyG3B'])],
    ]
    t3 = Table(pref_data, colWidths=[55*mm, 115*mm])
    t3.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 0.5, LINE),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t3)
    story.append(Spacer(1, 10*mm))

    story.append(Paragraph('Possible exploration areas', styles['H2G3B']))
    story.append(Paragraph('These examples are prompts for research, not recommendations or predictions.', styles['Deck']))
    subj_data = [
        [Paragraph('<b>Exploration area</b>', styles['SmallG3B']), Paragraph('<b>Why it may be worth investigating</b>', styles['SmallG3B'])],
        [Paragraph('Applied sciences', styles['BodyG3B']), Paragraph('Connects analytical reasoning with practical investigation.', styles['BodyG3B'])],
        [Paragraph('Economics and social research', styles['BodyG3B']), Paragraph('Combines evidence, written interpretation and real-world questions.', styles['BodyG3B'])],
        [Paragraph('Design and technology', styles['BodyG3B']), Paragraph('Could test spatial thinking, iteration and project-based learning.', styles['BodyG3B'])],
    ]
    t4 = Table(subj_data, colWidths=[55*mm, 115*mm])
    t4.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, LINE),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t4)
    story.append(Spacer(1, 8*mm))

    story.append(Paragraph('Suggested next steps', styles['H2G3B']))
    steps = [
        ('01', 'Discuss the profile alongside school performance, interests and practical constraints.'),
        ('02', 'Choose two exploration areas and complete one small project or introductory activity in each.'),
        ('03', 'Compare subject prerequisites using official school or university information.'),
        ('04', 'Revisit the plan after gaining new evidence; do not let one report make the decision.'),
    ]
    steps_data = [[Paragraph(f'<b>{num}</b>', styles['Kicker']), Paragraph(text, styles['BodyG3B'])] for num, text in steps]
    t5 = Table(steps_data, colWidths=[10*mm, 160*mm])
    t5.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t5)
    story.append(Spacer(1, 6*mm))

    story.append(Paragraph('Questions for a counselling conversation', styles['H3G3B']))
    story.append(Paragraph('What options is the learner currently considering? What evidence supports or challenges each option? Which constraints need to be planned around? What small next action would produce useful new information?', styles['BodyG3B']))

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(f'Wrote {OUT}')

if __name__ == '__main__':
    build()

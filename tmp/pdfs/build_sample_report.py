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

doc = SimpleDocTemplate(OUT, pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=20*mm, bottomMargin=20*mm, title='G3B Education Sample Assessment Report')
story = []
story += [Paragraph('SAMPLE REPORT / FICTIONAL DATA', styles['Kicker']), Paragraph('Student Direction Profile', styles['TitleG3B']), Paragraph('A demonstration of how assessment themes may be organised for a guided conversation. This is not a real student report, diagnosis, prediction, or validated assessment result.', styles['Deck'])]

notice = Table([[Paragraph('<b>Important</b><br/>All names, scores and recommendations in this document are fictional. Actual G3B reports depend on the authorized instrument used and professional interpretation.', styles['BodyG3B'])]], colWidths=[170*mm])
notice.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#FFF2E9')),('BOX',(0,0),(-1,-1),1,ORANGE),('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),8)]))
story += [notice, Spacer(1,10*mm), Paragraph('Profile overview', styles['H2G3B'])]
profile = [['Sample learner','Aarav Mehta (fictional)'],['Current stage','Exploring subject choices'],['Purpose','Discuss strengths, interests and areas for further exploration'],['Interpretation','Guided review with a counsellor']]
t=Table(profile,colWidths=[45*mm,125*mm]);t.setStyle(TableStyle([('FONTNAME',(0,0),(-1,-1),FAMILY),('FONTSIZE',(0,0),(-1,-1),8.5),('TEXTCOLOR',(0,0),(0,-1),NAVY),('TEXTCOLOR',(1,0),(1,-1),INK),('BACKGROUND',(0,0),(0,-1),PALE),('GRID',(0,0),(-1,-1),.5,LINE),('VALIGN',(0,0),(-1,-1),'TOP'),('PADDING',(0,0),(-1,-1),8)]));story.append(t)

story += [Spacer(1,8*mm), Paragraph('Illustrative aptitude pattern', styles['H2G3B']), Paragraph('The values below demonstrate presentation only. They are not norms, percentiles, or results from a real instrument.', styles['BodyG3B'])]
apt=[['Area','Illustrative indicator','Conversation prompt'],['Verbal reasoning','Developing strength','Which reading and explanation tasks feel most engaging?'],['Numerical reasoning','Balanced','What changes when a problem is presented visually?'],['Logical reasoning','Emerging strength','Which puzzles or systems hold attention longest?'],['Spatial reasoning','Explore further','Would a supervised practical task add useful evidence?']]
t=Table(apt,colWidths=[38*mm,38*mm,94*mm],repeatRows=1);t.setStyle(TableStyle([('FONTNAME',(0,0),(-1,-1),FAMILY),('FONTSIZE',(0,0),(-1,-1),8),('LEADING',(0,0),(-1,-1),11),('BACKGROUND',(0,0),(-1,0),NAVY),('TEXTCOLOR',(0,0),(-1,0),colors.white),('TEXTCOLOR',(0,1),(-1,-1),INK),('GRID',(0,0),(-1,-1),.5,LINE),('VALIGN',(0,0),(-1,-1),'TOP'),('PADDING',(0,0),(-1,-1),7)]));story.append(t)

story += [PageBreak(), Paragraph('INTERESTS & LEARNING PREFERENCES', styles['Kicker']), Paragraph('Themes to discuss, not labels to accept', styles['TitleG3B'])]
cards=[]
for title,body in [('Curiosity through projects','The fictional learner reports stronger engagement when ideas lead to a visible output or experiment.'),('Collaborative explanation','Discussing a concept with peers may help reveal understanding and unanswered questions.'),('Structured independence','Clear milestones appear helpful while leaving room to choose the approach.'),('Reflection before decisions','A short comparison framework may improve confidence when several options seem attractive.')]:
    cards.append([Paragraph(title,styles['H3G3B']),Paragraph(body,styles['SmallG3B'])])
t=Table(cards,colWidths=[85*mm,85*mm]);t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PALE),('BOX',(0,0),(-1,-1),.5,LINE),('INNERGRID',(0,0),(-1,-1),.5,LINE),('VALIGN',(0,0),(-1,-1),'TOP'),('PADDING',(0,0),(-1,-1),10)]));story.append(t)

story += [Spacer(1,9*mm),Paragraph('Possible exploration areas',styles['H2G3B']),Paragraph('These examples are prompts for research, not recommendations or predictions.',styles['BodyG3B'])]
areas=[['Exploration area','Why it may be worth investigating'],['Applied sciences','Connects analytical reasoning with practical investigation.'],['Economics and social research','Combines evidence, written interpretation and real-world questions.'],['Design and technology','Could test spatial thinking, iteration and project-based learning.']]
t=Table(areas,colWidths=[55*mm,115*mm],repeatRows=1);t.setStyle(TableStyle([('FONTNAME',(0,0),(-1,-1),FAMILY),('FONTSIZE',(0,0),(-1,-1),8.3),('BACKGROUND',(0,0),(-1,0),NAVY),('TEXTCOLOR',(0,0),(-1,0),colors.white),('TEXTCOLOR',(0,1),(-1,-1),INK),('GRID',(0,0),(-1,-1),.5,LINE),('PADDING',(0,0),(-1,-1),8)]));story.append(t)

story += [Spacer(1,9*mm),Paragraph('Suggested next steps',styles['H2G3B'])]
steps = []
for i,text in enumerate(['Discuss the profile alongside school performance, interests and practical constraints.','Choose two exploration areas and complete one small project or introductory activity in each.','Compare subject prerequisites using official school or university information.','Revisit the plan after gaining new evidence; do not let one report make the decision.'],1):
    steps.append([Paragraph(f'<font color="#F47B35"><b>{i:02d}</b></font>', styles['BodyG3B']), Paragraph(text, styles['BodyG3B'])])
t=Table(steps,colWidths=[7*mm,163*mm]);t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),4),('TOPPADDING',(0,0),(-1,-1),2),('BOTTOMPADDING',(0,0),(-1,-1),5)]));story.append(t)

story += [Spacer(1,6*mm),Paragraph('Questions for a counselling conversation',styles['H2G3B']),Paragraph('What options is the learner currently considering? What evidence supports or challenges each option? Which constraints need to be planned around? What small next action would produce useful new information?',styles['BodyG3B'])]
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import re,json,subprocess,textwrap
OUT=Path(__file__).resolve().parents[1]/'docs'/'report-assets'
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def font(s,b=False): return ImageFont.truetype(FONT.replace('.ttf','-Bold.ttf') if b else FONT,s)
ink='#090909'; blue='#171717'; orange='#F9DF50'; muted='#737682'
def text(d,xy,value,size=22,fill=ink,bold=False):d.text(xy,value,font=font(size,bold),fill=fill)
def wrapped(d,xy,value,width=30,size=20,fill=ink):
 for i,line in enumerate(textwrap.wrap(value,width)):
  text(d,(xy[0],xy[1]+i*(size+9)),line,size,fill)
# Logo rendered directly from the repository's vector asset.
mark=json.loads((OUT/'brand-mark.json').read_text())
im=Image.new('RGB',(1050,260),'white');d=ImageDraw.Draw(im)
d.rounded_rectangle((20,15,240,245),radius=45,fill='#F9DF50')
for segment in mark['path'].split('Z'):
 nums=[int(n) for n in re.findall(r'-?\d+',segment)]
 if nums:d.polygon([(35+nums[i]*4.5,22+nums[i+1]*3.5) for i in range(0,len(nums),2)],fill='#090909')
text(d,(280,32),'BarQ',100,ink,True)
text(d,(285,158),'Smart Spending & Hangouts',32,blue)
im.save(OUT/'product-logo.png')
# Two journeys as clear step diagrams.
im=Image.new('RGB',(1560,640),'white');d=ImageDraw.Draw(im)
for y,title,steps,color in [(25,'CURRENT JOURNEY — working hypothesis',[
 ('Check balance','Available balance does not explain what is safe to spend.'),('Search elsewhere','Compare places and prices across apps.'),('Discuss in chat','Coordinate preferences and budgets manually.'),('Agree and pay','Resolve the bill, then review spending separately.')],muted),(340,'PROPOSED JOURNEY — BarQ feature',[
 ('Understand spending','View calculated spending and budget indicators.'),('Ask Barq','Set a budget and request a catalogue-based plan.'),('Plan together','Use Hangouts and choose a payment option.'),('Confirm and review','Confirm a simulated payment and inspect history.')],blue)]:
 text(d,(15,y),title,26,color,True)
 for i,(head,body) in enumerate(steps):
  x=15+i*390
  d.rounded_rectangle((x,y+55,x+355,y+260),radius=18,fill='#FFFBE6',outline=color,width=2)
  text(d,(x+18,y+74),str(i+1)+'. '+head,22,color,True)
  wrapped(d,(x+18,y+120),body,width=26,size=20)
  if i<3:text(d,(x+361,y+135),'>',26,color,True)
im.save(OUT/'user-journeys.png')
# Concept wireframes, not screenshots of implemented screens.
im=Image.new('RGB',(1500,1130),'white');d=ImageDraw.Draw(im)
text(d,(35,20),'PROPOSED AI FEATURE — CONCEPT WIREFRAMES',30,ink,True)
for x,title in [(40,'1. Spending overview'),(530,'2. Build a plan'),(1020,'3. Group decision')]:
 d.rounded_rectangle((x,85,x+435,1050),radius=35,fill='#F7F7F9',outline=ink,width=3)
 text(d,(x+25,115),'BarQ',25,blue,True)
 text(d,(x+25,170),title,23,ink,True)
 text(d,(x+25,1000),'Home   Analyst   Hangouts',18,muted)
# overview
x=40
d.rounded_rectangle((x+25,230,x+410,390),radius=16,fill='#FFF4AA')
text(d,(x+45,250),'This week',21,blue,True);text(d,(x+45,292),'120 SAR spent',32,ink,True)
text(d,(x+45,345),'Illustrative demo values',16,muted)
wrapped(d,(x+28,430),'Your largest spending category: Food & Dining',28,22)
d.rounded_rectangle((x+25,550,x+410,755),radius=14,fill='white',outline='#D7DEEA')
text(d,(x+45,575),'Barq explains',22,blue,True)
wrapped(d,(x+45,620),'Review your budget before planning the next outing.',25,21)
d.rounded_rectangle((x+25,820,x+410,895),radius=14,fill='#F9DF50')
text(d,(x+72,844),'Plan within my budget',21,ink,True)
# plan
x=530
text(d,(x+30,235),'Budget per person',21,ink,True)
d.rounded_rectangle((x+25,275,x+410,345),radius=12,fill='white',outline='#ADB9D1')
text(d,(x+45,296),'35 SAR',26,ink,True)
text(d,(x+30,385),'Preference: Cafe',21)
d.rounded_rectangle((x+25,440,x+410,650),radius=14,fill='white',outline='#D7DEEA')
text(d,(x+45,462),'Suggested cafe',23,blue,True)
wrapped(d,(x+45,510),'Estimated budget: 21-35 SAR. Confirm current prices.',25,21)
wrapped(d,(x+30,695),'Why this option? It fits your selected category and budget band.',27,21)
d.rounded_rectangle((x+25,820,x+410,895),radius=14,fill='#F9DF50')
text(d,(x+103,844),'Create hangout',21,ink,True)
# group
x=1020
wrapped(d,(x+30,235),'Group outing: review the plan together',25,23)
text(d,(x+30,345),'How should we pay?',23,ink,True)
for yy,label in [(405,'Split the bill'),(505,'Everyone pays their own'),(605,'I will pay it')]:
 d.rounded_rectangle((x+25,yy,x+410,yy+75),radius=12,fill='white',outline='#ADB9D1')
 text(d,(x+44,yy+25),label,20)
wrapped(d,(x+30,725),'Individual budgets remain private. Confirm before payment.',27,20)
d.rounded_rectangle((x+25,855,x+410,930),radius=14,fill='#F9DF50')
text(d,(x+133,880),'Submit vote',21,ink,True)
text(d,(40,1080),'All values are illustrative. Layouts propose the experience; they are not live application captures.',21,muted)
im.save(OUT/'ai-wireframes.png')

# Low-opacity vector mark for the editable Word document background.
watermark=Image.new('RGBA',(1400,1800),(255,255,255,0))
wd=ImageDraw.Draw(watermark)
for segment in mark['path'].split('Z'):
 nums=[int(n) for n in re.findall(r'-?\d+',segment)]
 if nums:wd.polygon([(260+nums[i]*22,180+nums[i+1]*22) for i in range(0,len(nums),2)],fill=(9,9,9,9))
watermark.save(OUT/'logo-watermark.png')
print('Rendered BarQ logo, pale watermark, journeys and yellow/black concept wireframes.')

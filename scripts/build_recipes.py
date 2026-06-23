# -*- coding: utf-8 -*-
"""
Construit data/recipes.json a partir d'une liste compacte de recettes.
Pour ajouter une recette : copiez un bloc R(...) et adaptez-le, puis relancez :
    python3 scripts/build_recipes.py

Champs nutritionnels = valeurs APPROXIMATIVES par portion (1 personne).
ig = index glycemique global estime du plat (0-100).
diff = complexite sur 10 (1 = tres facile, 10 = tres complique).
"""
import json
import os
import urllib.parse

RECIPES = []


def R(nom, fam, types, saisons, temps, diff, kcal, gluc, prot, lip, fib, ig,
      ingredients, etapes, tags, marm, astuce=""):
    """ingredients = liste de (nom, quantite, [substituts])."""
    RECIPES.append(dict(
        nom=nom, famille=fam, types=types, saisons=saisons.split(","),
        temps=temps, diff=diff,
        nutrition=dict(kcal=kcal, glucides=gluc, proteines=prot, lipides=lip, fibres=fib),
        ig=ig,
        ingredients=[dict(nom=i[0], qte=i[1], subs=i[2]) for i in ingredients],
        etapes=etapes, tags=tags, astuce=astuce, marm=marm,
    ))


# ============================ OEUFS ============================
R("Omelette aux champignons", "oeuf", "ms", "toute", 15, 1,
  330, 4, 22, 25, 2, 35,
  [("Oeufs", "4", ["tofu brouille"]),
   ("Champignons de Paris", "250 g", ["epinards", "courgette"]),
   ("Oignon", "1/2", ["echalote", "ciboulette"]),
   ("Huile d'olive", "1 c. a soupe", ["beurre"]),
   ("Sel, poivre", "selon gout", [])],
  ["Emincez et faites revenir les champignons et l'oignon 5 min a la poele.",
   "Battez les oeufs avec sel et poivre, versez sur les champignons.",
   "Laissez prendre 3-4 min a feu moyen, pliez et servez."],
  ["rapide", "vegetarien", "sans feculent"], "omelette champignons")

R("Omelette aux fines herbes", "oeuf", "ms", "toute", 10, 1,
  300, 2, 20, 24, 0, 30,
  [("Oeufs", "4", []),
   ("Persil et ciboulette", "1 poignee", ["herbes de Provence", "basilic"]),
   ("Huile d'olive", "1 c. a soupe", ["beurre"]),
   ("Sel, poivre", "selon gout", [])],
  ["Battez les oeufs avec les herbes ciselees, sel et poivre.",
   "Versez dans la poele chaude huilee.",
   "Cuisez 3-4 min, pliez et servez avec une salade verte."],
  ["rapide", "vegetarien", "express"], "omelette fines herbes")

R("Oeufs brouilles a la tomate", "oeuf", "ms", "ete,toute", 15, 2,
  290, 8, 18, 19, 2, 35,
  [("Oeufs", "4", []),
   ("Tomates", "2", ["coulis de tomate", "poivron"]),
   ("Oignon", "1/2", ["echalote"]),
   ("Huile d'olive", "1 c. a soupe", []),
   ("Sel, poivre, cumin", "selon gout", [])],
  ["Faites compoter tomates et oignon 8 min a la poele.",
   "Ajoutez les oeufs battus, melangez doucement sur feu doux.",
   "Retirez quand c'est cremeux, salez, poivrez."],
  ["vegetarien", "rapide"], "oeufs brouilles tomate")

R("Shakshuka (oeufs poches tomate-poivron)", "oeuf", "ms", "toute", 25, 3,
  310, 14, 17, 18, 4, 45,
  [("Oeufs", "4", []),
   ("Poivrons", "2", ["courgette"]),
   ("Tomates concassees (boite)", "400 g", ["tomates fraiches"]),
   ("Oignon", "1", ["echalote"]),
   ("Ail", "1 gousse", []),
   ("Cumin et paprika", "1 c. a cafe", ["curry"])],
  ["Faites revenir oignon, ail et poivrons 8 min.",
   "Ajoutez tomates et epices, laissez mijoter 10 min.",
   "Creusez 4 puits, cassez-y les oeufs, couvrez 5-6 min."],
  ["vegetarien", "plat unique", "conserve"], "shakshuka")

R("Frittata courgette-feta", "oeuf", "ms", "ete,printemps", 25, 3,
  340, 6, 21, 25, 2, 40,
  [("Oeufs", "5", []),
   ("Courgette", "1", ["poireau", "brocoli"]),
   ("Feta", "80 g", ["fromage de chevre", "mozzarella"]),
   ("Oignon", "1/2", []),
   ("Huile d'olive", "1 c. a soupe", [])],
  ["Faites revenir la courgette en des 6 min.",
   "Versez les oeufs battus, emiettez la feta dessus.",
   "Cuisez a couvert 10 min a feu doux jusqu'a prise."],
  ["vegetarien", "froid possible"], "frittata courgette")

R("Oeufs cocotte aux epinards", "oeuf", "ms", "hiver,toute", 20, 3,
  260, 5, 16, 19, 3, 35,
  [("Oeufs", "4", []),
   ("Epinards", "200 g", ["blettes", "brocoli"]),
   ("Creme legere", "4 c. a soupe", ["fromage blanc"]),
   ("Noix de muscade", "1 pincee", [])],
  ["Faites tomber les epinards 4 min, repartissez dans 4 ramequins.",
   "Ajoutez 1 c. de creme, cassez un oeuf par ramequin.",
   "Four 12 min a 180 C, le blanc doit etre pris."],
  ["vegetarien", "four"], "oeufs cocotte epinards")

R("Salade d'oeufs durs et crudites", "oeuf", "m", "ete,toute", 15, 1,
  280, 9, 16, 18, 5, 30,
  [("Oeufs", "4", []),
   ("Salade verte", "1", []),
   ("Concombre", "1/2", ["tomate"]),
   ("Tomates", "2", []),
   ("Vinaigrette (huile olive + moutarde)", "2 c. a soupe", [])],
  ["Faites cuire les oeufs 9 min, refroidissez et ecalez.",
   "Coupez les crudites, dressez sur la salade.",
   "Ajoutez les oeufs en quartiers et la vinaigrette."],
  ["sans cuisson chaude", "froid", "rapide"], "salade oeufs durs")

R("Galette de sarrasin oeuf-jambon", "oeuf", "ms", "toute", 20, 3,
  330, 30, 20, 13, 4, 45,
  [("Galettes de sarrasin", "2", ["tortilla de ble complet"]),
   ("Oeufs", "2", []),
   ("Jambon blanc", "2 tranches", ["jambon de dinde", "champignons"]),
   ("Emmental rape", "40 g", ["comte"])],
  ["Rechauffez une galette a la poele.",
   "Cassez un oeuf au centre, ajoutez jambon et fromage.",
   "Repliez les bords, laissez fondre 2 min."],
  ["rapide", "bretagne"], "galette sarrasin complete")

R("Quiche sans pate aux poireaux", "oeuf", "ms", "automne,hiver", 45, 3,
  300, 12, 18, 18, 4, 45,
  [("Oeufs", "4", []),
   ("Poireaux", "3", ["courgette", "brocoli"]),
   ("Lait", "20 cl", ["lait vegetal"]),
   ("Farine complete", "2 c. a soupe", ["maizena"]),
   ("Emmental rape", "50 g", [])],
  ["Emincez et faites fondre les poireaux 10 min.",
   "Battez oeufs, lait, farine et fromage, ajoutez les poireaux.",
   "Versez dans un moule huile, four 30 min a 180 C."],
  ["vegetarien", "four", "sans pate"], "quiche sans pate poireaux")

R("Tartines avocat-oeuf", "oeuf", "m", "toute", 10, 1,
  340, 24, 15, 20, 7, 40,
  [("Pain complet", "2 tranches", ["pain de seigle"]),
   ("Avocat", "1", ["houmous"]),
   ("Oeufs", "2", []),
   ("Citron", "1/2", []),
   ("Sel, poivre, piment", "selon gout", [])],
  ["Faites cuire les oeufs (au plat ou durs).",
   "Ecrasez l'avocat avec citron, sel et poivre sur le pain.",
   "Posez l'oeuf dessus, parsemez de piment."],
  ["rapide", "vegetarien", "express"], "tartine avocat oeuf")

# ============================ VOLAILLE ============================
R("Poulet grille citron-thym", "volaille", "ms", "ete,toute", 25, 2,
  300, 3, 38, 14, 1, 25,
  [("Blancs de poulet", "2", ["escalopes de dinde"]),
   ("Citron", "1", []),
   ("Thym", "2 branches", ["herbes de Provence", "romarin"]),
   ("Huile d'olive", "1 c. a soupe", []),
   ("Ail", "1 gousse", [])],
  ["Marinez le poulet 10 min avec citron, ail, thym et huile.",
   "Saisissez 5-6 min de chaque cote a la poele.",
   "Servez avec des legumes verts ou une salade."],
  ["proteine", "leger", "rapide"], "poulet citron thym")

R("Escalope de poulet a la moutarde", "volaille", "ms", "toute", 20, 2,
  320, 4, 37, 16, 1, 30,
  [("Escalopes de poulet", "2", ["dinde", "porc"]),
   ("Moutarde", "1 c. a soupe", ["moutarde a l'ancienne"]),
   ("Creme legere", "3 c. a soupe", ["yaourt nature"]),
   ("Champignons", "150 g", ["echalote"])],
  ["Saisissez les escalopes 4 min par face, reservez.",
   "Faites revenir les champignons, ajoutez moutarde et creme.",
   "Remettez le poulet, laissez napper 3 min."],
  ["proteine", "rapide"], "escalope poulet moutarde")

R("Poulet au curry et lait de coco", "volaille", "ms", "toute", 30, 3,
  390, 12, 35, 21, 3, 45,
  [("Blancs de poulet", "2", ["dinde", "pois chiches"]),
   ("Lait de coco", "20 cl", ["creme legere"]),
   ("Oignon", "1", []),
   ("Curry en poudre", "1 c. a soupe", ["curcuma + cumin"]),
   ("Poivron", "1", ["courgette", "carotte"])],
  ["Faites dorer le poulet en morceaux, reservez.",
   "Revenez oignon et poivron, ajoutez curry puis lait de coco.",
   "Remettez le poulet, mijotez 12 min. Servez avec riz complet."],
  ["proteine", "epices", "plat unique"], "poulet curry coco")

R("Emince de dinde au wok", "volaille", "ms", "toute", 20, 2,
  300, 14, 32, 11, 4, 45,
  [("Emince de dinde", "300 g", ["poulet", "tofu"]),
   ("Legumes wok (poivron, chou, carotte)", "400 g", ["courgette", "haricots verts"]),
   ("Sauce soja", "2 c. a soupe", ["sauce teriyaki"]),
   ("Gingembre", "1 c. a cafe", ["ail"]),
   ("Huile", "1 c. a soupe", [])],
  ["Saisissez la dinde a feu vif 4 min, reservez.",
   "Faites sauter les legumes 6 min en gardant du croquant.",
   "Remettez la dinde, ajoutez soja et gingembre, melangez 2 min."],
  ["proteine", "rapide", "asiatique"], "wok dinde legumes")

R("Cuisses de poulet roties au four", "volaille", "ms", "automne,hiver", 50, 2,
  380, 6, 34, 24, 2, 25,
  [("Cuisses de poulet", "2", ["pilons"]),
   ("Pommes de terre", "300 g", ["patate douce", "navet"]),
   ("Oignon", "1", []),
   ("Herbes de Provence", "1 c. a soupe", []),
   ("Huile d'olive", "2 c. a soupe", [])],
  ["Disposez poulet et legumes dans un plat, huilez et assaisonnez.",
   "Enfournez 45 min a 200 C en retournant a mi-cuisson.",
   "La peau doit etre doree et croustillante."],
  ["proteine", "four", "plat unique"], "cuisses poulet four")

R("Poulet basquaise", "volaille", "ms", "ete,automne", 40, 3,
  340, 14, 34, 15, 4, 45,
  [("Blancs de poulet", "2", ["cuisses"]),
   ("Poivrons rouge et vert", "2", []),
   ("Tomates concassees", "400 g", []),
   ("Oignon", "1", []),
   ("Ail", "1 gousse", []),
   ("Piment d'Espelette", "1 pincee", ["paprika"])],
  ["Dorez le poulet, reservez.",
   "Faites compoter oignon, poivrons, ail et tomates 15 min.",
   "Remettez le poulet, mijotez 15 min. Servez avec riz."],
  ["proteine", "mijote", "sud-ouest"], "poulet basquaise")

R("Salade de poulet et crudites", "volaille", "m", "ete,toute", 20, 1,
  340, 12, 33, 16, 6, 30,
  [("Blanc de poulet cuit", "2", ["restes de poulet", "thon"]),
   ("Salade verte", "1", []),
   ("Tomates cerises", "150 g", []),
   ("Mais", "2 c. a soupe", ["pois chiches"]),
   ("Vinaigrette", "2 c. a soupe", [])],
  ["Emincez le poulet cuit.",
   "Melangez salade, tomates, mais et poulet.",
   "Assaisonnez de vinaigrette legere."],
  ["froid", "rapide", "restes"], "salade poulet")

R("Brochettes de poulet et courgettes", "volaille", "ms", "ete,printemps", 30, 3,
  290, 6, 35, 13, 2, 30,
  [("Blancs de poulet", "2", ["dinde"]),
   ("Courgettes", "2", ["poivron", "champignon"]),
   ("Oignon rouge", "1", []),
   ("Paprika et huile d'olive", "2 c. a soupe", ["herbes"])],
  ["Coupez poulet et legumes en cubes, enfilez sur des piques.",
   "Badigeonnez d'huile et paprika.",
   "Grillez 12-15 min au four ou a la poele en tournant."],
  ["proteine", "barbecue", "ete"], "brochettes poulet courgette")

R("Poulet, riz complet et brocoli", "volaille", "ms", "toute", 30, 2,
  420, 38, 34, 12, 6, 50,
  [("Blancs de poulet", "2", ["dinde"]),
   ("Riz complet", "120 g cru", ["quinoa", "boulgour"]),
   ("Brocoli", "300 g", ["haricots verts", "chou-fleur"]),
   ("Sauce soja", "1 c. a soupe", [])],
  ["Cuisez le riz complet (18 min) et le brocoli vapeur (8 min).",
   "Poelez le poulet en des 8 min.",
   "Melangez le tout, ajoutez la sauce soja."],
  ["proteine", "complet", "plat unique"], "poulet riz complet brocoli")

R("Wrap au poulet et crudites", "volaille", "m", "toute", 15, 2,
  380, 34, 28, 14, 6, 45,
  [("Tortilla de ble complet", "2", ["galette de sarrasin"]),
   ("Blanc de poulet cuit", "1", ["thon", "jambon"]),
   ("Salade, tomate, carotte rapee", "1 bol", []),
   ("Fromage blanc + moutarde", "2 c. a soupe", ["houmous"])],
  ["Tartinez la tortilla de sauce au fromage blanc.",
   "Garnissez de poulet et crudites.",
   "Roulez serre et coupez en deux."],
  ["rapide", "froid", "nomade"], "wrap poulet")

R("Emince de dinde a la creme et champignons", "volaille", "ms", "automne,hiver", 25, 2,
  330, 8, 34, 17, 2, 35,
  [("Emince de dinde", "300 g", ["poulet"]),
   ("Champignons", "250 g", []),
   ("Creme legere", "10 cl", ["yaourt", "lait de coco"]),
   ("Echalote", "1", ["oignon"]),
   ("Persil", "1 poignee", [])],
  ["Saisissez la dinde 5 min, reservez.",
   "Faites revenir echalote et champignons 6 min.",
   "Ajoutez la creme, remettez la dinde, mijotez 5 min."],
  ["proteine", "rapide"], "emince dinde creme champignons")

# ============================ POISSON ============================
R("Pave de saumon au four", "poisson", "ms", "toute", 25, 2,
  380, 2, 34, 26, 0, 20,
  [("Paves de saumon", "2", ["truite", "cabillaud"]),
   ("Citron", "1", []),
   ("Aneth ou persil", "1 poignee", ["ciboulette"]),
   ("Huile d'olive", "1 c. a soupe", [])],
  ["Posez les paves sur du papier cuisson, arrosez d'huile et citron.",
   "Parsemez d'herbes, sel et poivre.",
   "Four 15 min a 200 C. Servez avec des legumes verts."],
  ["omega-3", "four", "leger"], "saumon four citron")

R("Papillote de cabillaud aux legumes", "poisson", "ms", "toute", 30, 2,
  280, 8, 32, 12, 4, 25,
  [("Dos de cabillaud", "2", ["colin", "lieu"]),
   ("Courgette", "1", ["fenouil", "poireau"]),
   ("Tomates cerises", "150 g", []),
   ("Citron + huile d'olive", "2 c. a soupe", []),
   ("Thym", "selon gout", [])],
  ["Repartissez les legumes en lamelles sur 2 feuilles de papier.",
   "Posez le poisson, citron, huile et thym, fermez les papillotes.",
   "Four 20 min a 200 C."],
  ["leger", "four", "sans matiere grasse"], "papillote cabillaud legumes")

R("Colin sauce tomate", "poisson", "ms", "toute", 25, 2,
  260, 9, 31, 10, 3, 35,
  [("Filets de colin", "2", ["cabillaud", "merlu"]),
   ("Tomates concassees", "400 g", []),
   ("Oignon", "1", []),
   ("Ail", "1 gousse", []),
   ("Olives noires", "1 poignee", ["capres"])],
  ["Faites une sauce tomate avec oignon, ail et tomates (12 min).",
   "Posez les filets dans la sauce, ajoutez les olives.",
   "Couvrez et laissez pocher 10 min."],
  ["leger", "mediterraneen"], "colin sauce tomate")

R("Truite aux amandes", "poisson", "ms", "toute", 20, 2,
  370, 5, 33, 24, 2, 25,
  [("Filets de truite", "2", ["saumon", "cabillaud"]),
   ("Amandes effilees", "40 g", ["noisettes", "pignons"]),
   ("Beurre ou huile", "1 c. a soupe", []),
   ("Citron", "1/2", [])],
  ["Poelez les filets cote peau 4 min, retournez 3 min.",
   "Faites dorer les amandes a sec ou avec un peu de beurre.",
   "Parsemez les amandes et un filet de citron."],
  ["omega-3", "rapide"], "truite amandes")

R("Maquereaux au four a la moutarde", "poisson", "ms", "toute", 25, 2,
  360, 3, 28, 26, 1, 20,
  [("Filets de maquereau", "4", ["sardines", "saumon"]),
   ("Moutarde a l'ancienne", "1 c. a soupe", []),
   ("Citron", "1", []),
   ("Herbes de Provence", "selon gout", [])],
  ["Badigeonnez les filets de moutarde.",
   "Arrosez de citron, parsemez d'herbes.",
   "Four 15 min a 200 C."],
  ["omega-3", "economique", "four"], "maquereau moutarde four")

R("Salade de sardines et pommes de terre", "poisson", "m", "ete,toute", 20, 1,
  380, 28, 24, 19, 4, 50,
  [("Sardines a l'huile (boite)", "2 boites", ["maquereau", "thon"]),
   ("Pommes de terre", "250 g", ["lentilles cuites"]),
   ("Oignon rouge", "1/2", []),
   ("Salade verte + vinaigrette", "1 bol", [])],
  ["Cuisez les pommes de terre 18 min, coupez en rondelles tiedes.",
   "Dressez avec salade, oignon et sardines egouttees.",
   "Assaisonnez de vinaigrette."],
  ["omega-3", "conserve", "economique"], "salade sardines pommes de terre")

R("Salade de thon, haricots et oeuf", "poisson", "m", "ete,toute", 15, 1,
  340, 16, 30, 16, 7, 35,
  [("Thon au naturel (boite)", "2 boites", ["sardines", "poulet"]),
   ("Haricots blancs (boite)", "200 g", ["pois chiches", "lentilles"]),
   ("Oeufs durs", "2", []),
   ("Tomates", "2", []),
   ("Vinaigrette", "2 c. a soupe", [])],
  ["Egouttez et rincez thon et haricots.",
   "Melangez avec tomates en des et oeufs en quartiers.",
   "Assaisonnez de vinaigrette legere."],
  ["proteine", "froid", "sans cuisson"], "salade thon haricots blancs")

R("Crevettes sautees a l'ail", "poisson", "ms", "toute", 15, 2,
  240, 4, 30, 11, 1, 25,
  [("Crevettes decortiquees", "300 g", ["gambas", "noix de Saint-Jacques"]),
   ("Ail", "2 gousses", []),
   ("Persil", "1 poignee", ["coriandre"]),
   ("Huile d'olive", "1 c. a soupe", []),
   ("Citron", "1/2", [])],
  ["Chauffez l'huile, faites sauter l'ail 30 s.",
   "Ajoutez les crevettes 4-5 min jusqu'a coloration.",
   "Citron et persil, servez aussitot."],
  ["rapide", "express", "leger"], "crevettes ail persil")

R("Poke bowl au saumon", "poisson", "m", "ete,toute", 20, 3,
  450, 42, 30, 18, 6, 50,
  [("Saumon cru (extra frais) ou cuit", "200 g", ["thon", "tofu"]),
   ("Riz complet", "100 g cru", ["quinoa"]),
   ("Avocat", "1", []),
   ("Concombre + edamame", "1 bol", ["carotte"]),
   ("Sauce soja + sesame", "2 c. a soupe", [])],
  ["Cuisez le riz, laissez tiedir.",
   "Coupez saumon, avocat et legumes en des.",
   "Dressez en bol, nappez de sauce soja-sesame."],
  ["omega-3", "froid", "tendance"], "poke bowl saumon")

R("Dos de cabillaud et lentilles", "poisson", "ms", "automne,hiver", 30, 2,
  360, 30, 38, 8, 9, 35,
  [("Dos de cabillaud", "2", ["colin", "saumon"]),
   ("Lentilles vertes cuites", "250 g", ["lentilles corail", "pois chiches"]),
   ("Carotte", "1", []),
   ("Echalote", "1", []),
   ("Persil + citron", "selon gout", [])],
  ["Faites revenir echalote et carotte, ajoutez les lentilles, rechauffez.",
   "Poelez ou cuisez le cabillaud vapeur 10 min.",
   "Servez le poisson sur les lentilles, citron et persil."],
  ["proteine", "fibres", "ig bas"], "cabillaud lentilles")

R("Filet de colin pane maison et epinards", "poisson", "ms", "toute", 25, 3,
  330, 18, 32, 14, 4, 40,
  [("Filets de colin", "2", ["cabillaud", "merlu"]),
   ("Chapelure complete", "4 c. a soupe", ["flocons d'avoine mixes"]),
   ("Oeuf", "1", []),
   ("Epinards", "300 g", ["brocoli"])],
  ["Passez les filets dans l'oeuf battu puis la chapelure.",
   "Poelez 4 min par face jusqu'a doree.",
   "Faites tomber les epinards a cote, servez ensemble."],
  ["proteine", "famille"], "colin pane epinards")

# ============================ BOEUF ============================
R("Steak hache et haricots verts", "boeuf", "ms", "toute", 20, 1,
  340, 7, 36, 18, 5, 25,
  [("Steaks haches 5%", "2", ["steak de dinde"]),
   ("Haricots verts", "300 g", ["brocoli", "courgette"]),
   ("Echalote", "1", []),
   ("Huile d'olive", "1 c. a soupe", [])],
  ["Faites revenir l'echalote, ajoutez les haricots 8 min.",
   "Poelez les steaks 3-4 min selon cuisson.",
   "Servez ensemble, salez, poivrez."],
  ["proteine", "rapide", "fer"], "steak hache haricots verts")

R("Chili con carne", "boeuf", "ms", "automne,hiver", 40, 3,
  420, 38, 32, 14, 11, 45,
  [("Boeuf hache 5%", "300 g", ["dinde hachee", "proteine de soja"]),
   ("Haricots rouges (boite)", "400 g", ["haricots noirs"]),
   ("Tomates concassees", "400 g", []),
   ("Oignon + poivron", "1 + 1", []),
   ("Cumin, paprika, piment", "1 c. a soupe", [])],
  ["Faites dorer la viande avec oignon et poivron.",
   "Ajoutez epices, tomates et haricots egouttes.",
   "Mijotez 25 min a feu doux. Servez avec riz complet."],
  ["proteine", "fibres", "plat unique", "batch cooking"], "chili con carne")

R("Boulettes de boeuf a la tomate", "boeuf", "ms", "toute", 35, 3,
  380, 14, 32, 22, 4, 40,
  [("Boeuf hache", "300 g", ["dinde", "agneau"]),
   ("Oeuf", "1", []),
   ("Chapelure complete", "2 c. a soupe", ["flocons d'avoine"]),
   ("Tomates concassees", "400 g", []),
   ("Oignon + ail", "1 + 1", []),
   ("Herbes", "selon gout", [])],
  ["Melangez viande, oeuf, chapelure, formez des boulettes.",
   "Dorez-les a la poele, reservez.",
   "Faites la sauce tomate, remettez les boulettes 15 min."],
  ["proteine", "famille"], "boulettes boeuf tomate")

R("Boeuf saute aux legumes (wok)", "boeuf", "ms", "toute", 25, 2,
  360, 16, 30, 18, 4, 45,
  [("Boeuf a fondue ou bavette", "300 g", ["poulet", "tofu"]),
   ("Brocoli + poivron", "400 g", ["chou", "haricots verts"]),
   ("Sauce soja + gingembre", "2 c. a soupe", []),
   ("Ail", "1 gousse", []),
   ("Huile", "1 c. a soupe", [])],
  ["Saisissez le boeuf emince a feu vif 3 min, reservez.",
   "Faites sauter les legumes 6 min.",
   "Remettez le boeuf, soja, ail et gingembre, melangez."],
  ["proteine", "rapide", "asiatique"], "boeuf saute legumes wok")

R("Hachis parmentier de patate douce", "boeuf", "ms", "automne,hiver", 50, 3,
  430, 40, 28, 18, 7, 50,
  [("Boeuf hache 5%", "300 g", ["dinde", "lentilles"]),
   ("Patates douces", "500 g", ["pommes de terre", "potiron"]),
   ("Oignon + ail", "1 + 1", []),
   ("Tomates concassees", "200 g", []),
   ("Emmental rape", "40 g", [])],
  ["Cuisez et ecrasez les patates douces en puree.",
   "Faites revenir viande, oignon, ail et tomates.",
   "Montez viande puis puree dans un plat, fromage, four 20 min a 200 C."],
  ["proteine", "famille", "four"], "hachis parmentier patate douce")

# ============================ PORC ============================
R("Filet mignon de porc au four", "porc", "ms", "toute", 40, 2,
  330, 6, 38, 16, 1, 25,
  [("Filet mignon de porc", "1 (400 g)", ["roti de dinde"]),
   ("Moutarde", "1 c. a soupe", []),
   ("Oignon + champignons", "1 + 200 g", []),
   ("Herbes de Provence", "selon gout", [])],
  ["Badigeonnez le filet de moutarde et herbes.",
   "Disposez avec oignon et champignons dans un plat.",
   "Four 30 min a 200 C, laissez reposer 5 min avant de trancher."],
  ["proteine", "four"], "filet mignon porc four")

R("Endives au jambon gratinees (light)", "porc", "ms", "automne,hiver", 45, 3,
  320, 16, 26, 16, 6, 35,
  [("Endives", "4", []),
   ("Jambon blanc", "4 tranches", ["jambon de dinde"]),
   ("Lait + maizena (sauce legere)", "25 cl + 1 c.", ["bechamel light"]),
   ("Emmental rape", "50 g", [])],
  ["Braisez les endives 15 min a la poele a couvert.",
   "Roulez chaque endive dans une tranche de jambon, disposez dans un plat.",
   "Nappez de sauce legere, fromage, four 20 min a 200 C."],
  ["famille", "four", "legume"], "endives jambon gratin")

R("Saute de porc aux poivrons", "porc", "ms", "ete,automne", 30, 2,
  340, 12, 33, 17, 3, 40,
  [("Saute de porc", "300 g", ["poulet", "dinde"]),
   ("Poivrons", "2", ["courgette"]),
   ("Oignon", "1", []),
   ("Sauce tomate ou soja", "2 c. a soupe", []),
   ("Paprika", "1 c. a cafe", [])],
  ["Dorez le porc 5 min, reservez.",
   "Faites revenir poivrons et oignon 8 min.",
   "Remettez le porc, sauce et paprika, mijotez 10 min."],
  ["proteine", "rapide"], "saute porc poivrons")

# ============================ LEGUMINEUSES ============================
R("Lentilles et oeuf poche", "legumineuse", "ms", "automne,hiver", 35, 2,
  380, 40, 24, 11, 14, 30,
  [("Lentilles vertes", "150 g cru", ["lentilles corail", "pois chiches"]),
   ("Oeufs", "2", []),
   ("Carotte + oignon", "1 + 1", []),
   ("Bouillon de legumes", "1 cube", []),
   ("Vinaigre + moutarde", "selon gout", [])],
  ["Cuisez les lentilles avec carotte et oignon 25 min.",
   "Pochez les oeufs 3 min dans l'eau fremissante vinaigree.",
   "Servez les lentilles assaisonnees, oeuf poche dessus."],
  ["vegetarien", "fibres", "ig bas", "proteine vegetale"], "lentilles oeuf poche")

R("Dahl de lentilles corail", "legumineuse", "ms", "toute", 30, 2,
  360, 42, 18, 11, 10, 35,
  [("Lentilles corail", "200 g", ["lentilles vertes"]),
   ("Lait de coco", "20 cl", ["creme legere"]),
   ("Tomates concassees", "200 g", []),
   ("Oignon + ail + gingembre", "1 + 1 + 1", []),
   ("Curry / curcuma", "1 c. a soupe", [])],
  ["Faites revenir oignon, ail, gingembre et epices.",
   "Ajoutez lentilles, tomates et lait de coco + 30 cl d'eau.",
   "Mijotez 20 min jusqu'a consistance cremeuse."],
  ["vegetarien", "fibres", "epices", "ig bas"], "dahl lentilles corail")

R("Curry de pois chiches", "legumineuse", "ms", "toute", 30, 2,
  350, 44, 15, 12, 12, 40,
  [("Pois chiches (boite)", "400 g", ["haricots blancs", "lentilles"]),
   ("Lait de coco", "20 cl", []),
   ("Epinards", "150 g", ["chou kale"]),
   ("Tomates concassees", "200 g", []),
   ("Oignon + curry", "1 + 1 c.", [])],
  ["Revenez oignon et curry, ajoutez tomates et lait de coco.",
   "Ajoutez pois chiches egouttes, mijotez 12 min.",
   "Incorporez les epinards 3 min. Servez avec riz."],
  ["vegetarien", "fibres", "plat unique"], "curry pois chiches")

R("Salade de pois chiches", "legumineuse", "m", "ete,toute", 15, 1,
  360, 38, 15, 16, 11, 35,
  [("Pois chiches (boite)", "400 g", ["lentilles", "haricots rouges"]),
   ("Concombre + tomates", "1 + 2", []),
   ("Oignon rouge", "1/2", []),
   ("Feta", "60 g", ["sans"]),
   ("Huile olive + citron", "2 c. a soupe", [])],
  ["Rincez et egouttez les pois chiches.",
   "Coupez les legumes en des, melangez le tout.",
   "Assaisonnez d'huile, citron, sel et feta emiettee."],
  ["vegetarien", "froid", "sans cuisson", "fibres"], "salade pois chiches feta")

R("Soupe de pois casses", "legumineuse", "ms", "automne,hiver", 45, 2,
  300, 40, 18, 4, 13, 30,
  [("Pois casses", "200 g", ["lentilles", "pois chiches"]),
   ("Carotte + oignon", "2 + 1", []),
   ("Lardons ou jambon (option)", "50 g", ["sans"]),
   ("Bouillon", "1 L", [])],
  ["Faites revenir oignon et carotte.",
   "Ajoutez pois casses et bouillon, cuisez 35 min.",
   "Mixez ou laissez entier selon gout."],
  ["vegetarien option", "fibres", "reconfortant"], "soupe pois casses")

R("Chili sin carne (vegetarien)", "legumineuse", "ms", "automne,hiver", 35, 2,
  360, 50, 18, 8, 15, 40,
  [("Haricots rouges (boite)", "400 g", ["haricots noirs"]),
   ("Mais", "150 g", []),
   ("Tomates concassees", "400 g", []),
   ("Poivron + oignon", "1 + 1", []),
   ("Cumin, paprika, piment", "1 c. a soupe", [])],
  ["Revenez oignon et poivron, ajoutez epices.",
   "Ajoutez tomates, haricots et mais, mijotez 20 min.",
   "Servez avec riz complet ou nature."],
  ["vegetarien", "fibres", "batch cooking"], "chili sin carne vegetarien")

R("Salade de lentilles et feta", "legumineuse", "m", "ete,toute", 20, 1,
  340, 36, 18, 12, 12, 30,
  [("Lentilles vertes cuites", "250 g", ["lentilles en boite"]),
   ("Feta", "60 g", ["chevre"]),
   ("Tomates + concombre", "2 + 1/2", []),
   ("Echalote", "1", []),
   ("Vinaigrette moutarde", "2 c. a soupe", [])],
  ["Si besoin, cuisez les lentilles 20 min puis refroidissez.",
   "Melangez avec legumes en des et echalote.",
   "Ajoutez feta et vinaigrette."],
  ["vegetarien", "froid", "fibres", "ig bas"], "salade lentilles feta")

R("Tartine de houmous et crudites", "legumineuse", "m", "toute", 10, 1,
  330, 34, 12, 16, 9, 40,
  [("Pain complet", "2 tranches", ["pain de seigle"]),
   ("Houmous", "4 c. a soupe", ["puree d'avocat"]),
   ("Carotte rapee + concombre", "1 bol", ["radis", "tomate"]),
   ("Graines de sesame", "1 c. a soupe", [])],
  ["Tartinez le pain de houmous.",
   "Disposez les crudites dessus.",
   "Parsemez de graines et d'un filet d'huile."],
  ["vegetarien", "rapide", "express"], "tartine houmous crudites")

# ============================ VEGETARIEN / LEGUMES ============================
R("Ratatouille et oeuf", "vege", "ms", "ete,automne", 45, 2,
  280, 18, 12, 16, 8, 30,
  [("Aubergine + courgette", "1 + 2", []),
   ("Poivrons", "2", []),
   ("Tomates", "4", ["tomates concassees"]),
   ("Oignon + ail", "1 + 1", []),
   ("Oeufs", "2", ["feta"]),
   ("Herbes de Provence", "1 c. a soupe", [])],
  ["Coupez tous les legumes en des.",
   "Faites mijoter oignon, poivrons, aubergine, courgette, tomates 30 min.",
   "Servez avec un oeuf au plat ou poche par personne."],
  ["vegetarien", "legumes", "batch cooking", "ig bas"], "ratatouille")

R("Gratin de courgettes", "vege", "ms", "ete,printemps", 45, 2,
  300, 12, 16, 19, 4, 35,
  [("Courgettes", "4", ["brocoli", "chou-fleur"]),
   ("Oeufs", "3", []),
   ("Creme legere", "10 cl", ["lait"]),
   ("Emmental rape", "60 g", ["comte"]),
   ("Ail", "1 gousse", [])],
  ["Faites revenir les courgettes en rondelles 10 min.",
   "Battez oeufs, creme et fromage, melangez aux courgettes.",
   "Versez dans un plat, four 25 min a 180 C."],
  ["vegetarien", "four", "legume"], "gratin courgettes")

R("Poelee mediterraneenne", "vege", "ms", "ete", 25, 1,
  240, 20, 8, 14, 7, 35,
  [("Courgette + aubergine", "1 + 1", []),
   ("Poivrons", "2", []),
   ("Tomates cerises", "200 g", []),
   ("Oignon + ail", "1 + 1", []),
   ("Olives + huile d'olive", "1 poignee + 2 c.", [])],
  ["Coupez tous les legumes en morceaux.",
   "Faites sauter a feu vif 15 min en remuant.",
   "Ajoutez olives, herbes, servez chaud ou tiede."],
  ["vegetarien", "rapide", "accompagnement"], "poelee legumes mediterraneenne")

R("Buddha bowl quinoa", "vege", "m", "toute", 25, 2,
  420, 48, 16, 18, 12, 45,
  [("Quinoa", "100 g cru", ["boulgour", "riz complet"]),
   ("Pois chiches", "150 g", ["tofu", "oeuf dur"]),
   ("Avocat", "1", []),
   ("Carotte rapee + chou rouge", "1 bol", []),
   ("Sauce yaourt-citron", "2 c. a soupe", [])],
  ["Cuisez le quinoa 12 min, laissez tiedir.",
   "Disposez en bol quinoa, pois chiches et crudites par zones.",
   "Ajoutez l'avocat et nappez de sauce."],
  ["vegetarien", "complet", "froid", "fibres"], "buddha bowl quinoa")

R("Taboule de chou-fleur", "vege", "m", "ete", 20, 2,
  220, 16, 9, 13, 7, 25,
  [("Chou-fleur", "1/2", ["chou-fleur surgele rape"]),
   ("Tomates + concombre", "2 + 1/2", []),
   ("Menthe + persil", "1 poignee", []),
   ("Citron + huile d'olive", "2 c. a soupe", []),
   ("Oignon nouveau", "1", [])],
  ["Mixez le chou-fleur cru en semoule.",
   "Ajoutez legumes en des et herbes ciselees.",
   "Assaisonnez citron-huile, laissez reposer 15 min au frais."],
  ["vegetarien", "froid", "low carb", "ig bas"], "taboule chou-fleur")

R("Legumes rotis au four", "vege", "ms", "automne,hiver", 45, 1,
  250, 28, 6, 12, 9, 40,
  [("Patate douce + carottes", "1 + 2", ["potiron", "navet"]),
   ("Poivron + oignon rouge", "1 + 1", []),
   ("Courgette", "1", []),
   ("Huile d'olive + herbes", "2 c. a soupe", [])],
  ["Coupez les legumes en gros morceaux.",
   "Melangez avec huile, herbes, sel.",
   "Four 35 min a 200 C en remuant a mi-cuisson."],
  ["vegetarien", "four", "batch cooking"], "legumes rotis four")

R("Poivrons farcis au quinoa", "vege", "ms", "ete,automne", 50, 3,
  330, 42, 13, 12, 9, 45,
  [("Poivrons", "4", ["tomates", "courgettes rondes"]),
   ("Quinoa", "100 g cru", ["riz complet", "boulgour"]),
   ("Tomates concassees", "200 g", []),
   ("Feta ou emmental", "60 g", []),
   ("Oignon + herbes", "1", [])],
  ["Cuisez le quinoa, melangez avec tomates, oignon et fromage.",
   "Coupez le chapeau des poivrons, videz-les, garnissez.",
   "Four 35 min a 190 C."],
  ["vegetarien", "four", "complet"], "poivrons farcis quinoa")

R("Tomates farcies (light)", "vege", "ms", "ete", 50, 3,
  300, 16, 22, 16, 4, 35,
  [("Grosses tomates", "4", ["courgettes rondes", "poivrons"]),
   ("Viande hachee 5% ou dinde", "250 g", ["lentilles", "tofu"]),
   ("Oignon + ail", "1 + 1", []),
   ("Herbes + un peu de riz complet", "selon gout", [])],
  ["Evidez les tomates, recuperez la pulpe.",
   "Melangez viande, oignon, herbes et pulpe, garnissez les tomates.",
   "Four 35 min a 190 C."],
  ["famille", "four", "legume"], "tomates farcies")

R("Courgettes farcies", "vege", "ms", "ete", 50, 3,
  310, 14, 22, 17, 5, 35,
  [("Courgettes rondes ou longues", "4", ["aubergines", "poivrons"]),
   ("Viande hachee ou thon", "250 g", ["lentilles"]),
   ("Tomate + oignon", "1 + 1", []),
   ("Fromage rape", "40 g", [])],
  ["Coupez et evidez les courgettes, faites-les precuire 5 min.",
   "Melangez chair, viande, tomate et oignon, garnissez.",
   "Fromage dessus, four 30 min a 190 C."],
  ["famille", "four"], "courgettes farcies")

R("Gratin de brocoli", "vege", "ms", "automne,hiver", 40, 2,
  280, 12, 16, 18, 5, 35,
  [("Brocoli", "600 g", ["chou-fleur", "courgette"]),
   ("Oeufs", "2", []),
   ("Creme legere + lait", "20 cl", []),
   ("Emmental rape", "60 g", []),
   ("Muscade", "1 pincee", [])],
  ["Cuisez le brocoli vapeur 8 min.",
   "Battez oeufs, creme, lait, muscade et fromage.",
   "Versez sur le brocoli en plat, four 20 min a 190 C."],
  ["vegetarien", "four", "legume"], "gratin brocoli")

R("Chou-fleur roti aux epices", "vege", "ms", "automne,hiver", 40, 1,
  220, 16, 9, 13, 7, 30,
  [("Chou-fleur", "1", ["brocoli", "romanesco"]),
   ("Curcuma + cumin + paprika", "1 c. a soupe", ["curry"]),
   ("Huile d'olive", "2 c. a soupe", []),
   ("Yaourt-citron (sauce)", "3 c. a soupe", [])],
  ["Detaillez le chou-fleur en bouquets.",
   "Enrobez d'huile et d'epices, etalez sur une plaque.",
   "Four 30 min a 200 C. Servez avec la sauce yaourt."],
  ["vegetarien", "four", "epices", "ig bas"], "chou-fleur roti epices")

R("Risotto d'orge aux champignons", "vege", "ms", "automne,hiver", 40, 3,
  380, 52, 14, 11, 9, 45,
  [("Orge perle", "150 g", ["riz complet", "epeautre"]),
   ("Champignons", "300 g", []),
   ("Oignon + ail", "1 + 1", []),
   ("Bouillon de legumes", "75 cl", []),
   ("Parmesan", "40 g", [])],
  ["Faites revenir oignon et champignons.",
   "Ajoutez l'orge, puis le bouillon louche par louche 30 min.",
   "Hors du feu, ajoutez le parmesan."],
  ["vegetarien", "cremeux", "ig modere"], "risotto orge champignons")

# ============================ SOUPES / VELOUTES ============================
R("Soupe minestrone", "soupe", "ms", "automne,hiver", 40, 2,
  280, 38, 12, 7, 10, 40,
  [("Haricots blancs (boite)", "200 g", ["pois chiches"]),
   ("Carotte + courgette + celeri", "3 legumes", ["poireau", "chou"]),
   ("Tomates concassees", "400 g", []),
   ("Petites pates completes", "60 g", ["orge"]),
   ("Oignon + bouillon", "1 + 1 L", [])],
  ["Revenez oignon et legumes en des 8 min.",
   "Ajoutez tomates, bouillon et haricots, cuisez 20 min.",
   "Ajoutez les pates 8 min avant la fin."],
  ["vegetarien", "fibres", "plat unique"], "minestrone")

R("Veloute de courgette", "soupe", "ms", "ete,printemps", 25, 1,
  160, 12, 6, 9, 4, 35,
  [("Courgettes", "4", ["brocoli"]),
   ("Oignon", "1", []),
   ("Vache qui rit ou chevre", "2 portions", ["creme legere"]),
   ("Bouillon", "75 cl", [])],
  ["Faites revenir l'oignon, ajoutez courgettes et bouillon.",
   "Cuisez 15 min, mixez finement.",
   "Incorporez le fromage, rectifiez l'assaisonnement."],
  ["vegetarien", "leger", "rapide"], "veloute courgette")

R("Veloute de potiron", "soupe", "ms", "automne,hiver", 35, 2,
  200, 24, 5, 8, 6, 45,
  [("Potiron ou potimarron", "800 g", ["courge butternut", "carotte"]),
   ("Oignon", "1", []),
   ("Lait de coco ou creme", "10 cl", []),
   ("Bouillon", "50 cl", []),
   ("Muscade", "1 pincee", [])],
  ["Faites revenir l'oignon, ajoutez le potiron en des.",
   "Couvrez de bouillon, cuisez 20 min, mixez.",
   "Ajoutez la creme et la muscade."],
  ["vegetarien", "automne", "reconfortant"], "veloute potiron")

R("Soupe de legumes maison", "soupe", "ms", "automne,hiver", 35, 1,
  150, 22, 5, 4, 7, 40,
  [("Poireau + carotte + navet", "3 legumes", ["celeri", "courgette"]),
   ("Pomme de terre", "1", ["patate douce"]),
   ("Oignon", "1", []),
   ("Bouillon", "1 L", [])],
  ["Epluchez et coupez tous les legumes.",
   "Couvrez de bouillon, cuisez 25 min.",
   "Mixez ou laissez en morceaux."],
  ["vegetarien", "basique", "batch cooking"], "soupe legumes maison")

R("Veloute de brocoli", "soupe", "ms", "toute", 25, 1,
  170, 12, 8, 9, 5, 30,
  [("Brocoli", "600 g", ["chou-fleur", "epinards"]),
   ("Oignon", "1", []),
   ("Creme legere", "10 cl", ["lait"]),
   ("Bouillon", "75 cl", [])],
  ["Faites revenir l'oignon, ajoutez brocoli et bouillon.",
   "Cuisez 15 min, mixez.",
   "Ajoutez la creme, sel et poivre."],
  ["vegetarien", "leger", "ig bas"], "veloute brocoli")

R("Soupe de lentilles", "soupe", "ms", "automne,hiver", 40, 2,
  300, 40, 18, 5, 14, 30,
  [("Lentilles", "200 g", ["lentilles corail"]),
   ("Carotte + oignon + celeri", "2 + 1 + 1", []),
   ("Tomates concassees", "200 g", []),
   ("Cumin", "1 c. a cafe", []),
   ("Bouillon", "1 L", [])],
  ["Faites revenir les legumes en des.",
   "Ajoutez lentilles, tomates, cumin et bouillon.",
   "Cuisez 30 min. Mixez a moitie pour une texture cremeuse."],
  ["vegetarien", "fibres", "ig bas", "plat unique"], "soupe lentilles")

R("Veloute de champignons", "soupe", "ms", "automne,hiver", 30, 2,
  190, 12, 8, 11, 4, 30,
  [("Champignons", "500 g", ["cepes surgeles"]),
   ("Oignon + ail", "1 + 1", []),
   ("Creme legere", "10 cl", []),
   ("Bouillon", "60 cl", []),
   ("Persil", "selon gout", [])],
  ["Faites revenir oignon, ail et champignons 10 min.",
   "Ajoutez le bouillon, cuisez 10 min, mixez.",
   "Incorporez la creme et le persil."],
  ["vegetarien", "automne", "leger"], "veloute champignons")

# ============================ SALADES / DIVERS ============================
R("Salade grecque", "salade", "m", "ete", 15, 1,
  300, 14, 11, 22, 5, 25,
  [("Tomates + concombre", "3 + 1", []),
   ("Feta", "100 g", ["mozzarella"]),
   ("Oignon rouge + olives", "1 + 1 poignee", []),
   ("Huile d'olive + origan", "2 c. a soupe", [])],
  ["Coupez tomates et concombre en gros morceaux.",
   "Ajoutez oignon, olives et feta en des.",
   "Arrosez d'huile d'olive et d'origan."],
  ["vegetarien", "froid", "sans cuisson", "ig bas"], "salade grecque feta")

R("Salade caprese et oeuf", "salade", "m", "ete", 15, 1,
  330, 8, 22, 23, 2, 25,
  [("Tomates", "3", []),
   ("Mozzarella", "125 g", ["burrata", "feta"]),
   ("Oeufs durs", "2", []),
   ("Basilic + huile d'olive", "1 poignee + 2 c.", [])],
  ["Coupez tomates et mozzarella en tranches, alternez.",
   "Ajoutez les oeufs durs en quartiers.",
   "Basilic, huile d'olive, sel et poivre."],
  ["vegetarien", "froid", "rapide"], "salade caprese")

R("Salade concombre-feta et poulet", "salade", "m", "ete", 15, 1,
  320, 10, 32, 16, 3, 25,
  [("Concombre", "1", []),
   ("Blanc de poulet cuit", "2", ["thon", "pois chiches"]),
   ("Feta", "60 g", []),
   ("Menthe + citron + huile", "selon gout", [])],
  ["Coupez le concombre en demi-rondelles.",
   "Ajoutez poulet emince et feta.",
   "Assaisonnez de menthe, citron et huile."],
  ["froid", "rapide", "ig bas"], "salade concombre feta poulet")

R("Salade composee complete", "salade", "m", "ete,toute", 20, 1,
  380, 24, 24, 20, 7, 35,
  [("Salade verte", "1", []),
   ("Thon ou jambon", "1 boite / 2 tr.", ["oeuf", "poulet"]),
   ("Mais + tomates + mais", "1 bol", []),
   ("Pommes de terre ou pois chiches", "150 g", []),
   ("Oeuf dur + vinaigrette", "2 + 2 c.", [])],
  ["Disposez la salade dans un grand saladier.",
   "Ajoutez tous les ingredients en zones.",
   "Assaisonnez de vinaigrette au moment de servir."],
  ["froid", "complet", "famille"], "salade composee")

# ============================ FECULENTS COMPLETS ============================
R("Pates completes sauce tomate-basilic", "vege", "ms", "toute", 25, 1,
  420, 62, 16, 10, 9, 50,
  [("Pates completes", "150 g cru", ["pates de legumineuses"]),
   ("Tomates concassees", "400 g", ["coulis"]),
   ("Ail + oignon", "1 + 1", []),
   ("Basilic", "1 poignee", []),
   ("Parmesan", "30 g", [])],
  ["Cuisez les pates al dente (IG plus bas).",
   "Faites une sauce tomate avec ail, oignon et basilic 12 min.",
   "Melangez, parsemez de parmesan."],
  ["vegetarien", "rapide", "famille"], "pates completes tomate basilic")

R("Spaghetti complets aux legumes et thon", "poisson", "ms", "toute", 25, 2,
  450, 60, 28, 11, 10, 50,
  [("Spaghetti complets", "150 g cru", []),
   ("Thon au naturel", "1 boite", ["sardines", "poulet"]),
   ("Courgette + tomates", "1 + 300 g", []),
   ("Ail + huile d'olive", "1 + 1 c.", [])],
  ["Cuisez les pates al dente.",
   "Faites revenir ail, courgette puis tomates 10 min.",
   "Ajoutez le thon, melangez aux pates."],
  ["complet", "rapide", "famille"], "spaghetti complets thon legumes")

R("Semoule complete aux legumes (couscous leger)", "vege", "ms", "toute", 35, 2,
  410, 64, 14, 9, 12, 50,
  [("Semoule complete", "150 g", ["boulgour", "quinoa"]),
   ("Courgette + carotte + navet", "3 legumes", []),
   ("Pois chiches", "150 g", []),
   ("Tomates + oignon", "200 g + 1", []),
   ("Epices couscous (ras el hanout)", "1 c. a soupe", [])],
  ["Faites mijoter legumes, pois chiches, tomates et epices 25 min.",
   "Preparez la semoule complete (eau bouillante, 5 min couverte).",
   "Servez les legumes sur la semoule."],
  ["vegetarien", "fibres", "famille"], "couscous legumes semoule complete")

R("Boulgour aux petits legumes", "vege", "ms", "toute", 25, 1,
  360, 58, 12, 9, 11, 45,
  [("Boulgour", "150 g cru", ["quinoa", "semoule complete"]),
   ("Poivron + courgette", "1 + 1", []),
   ("Tomates + oignon", "2 + 1", []),
   ("Huile d'olive + persil", "2 c. a soupe", [])],
  ["Faites revenir oignon et legumes 8 min.",
   "Ajoutez le boulgour et 2 volumes d'eau bouillante.",
   "Couvrez 12 min hors du feu, ajoutez persil."],
  ["vegetarien", "complet", "rapide"], "boulgour legumes")

R("Wok de nouilles soba et crevettes", "poisson", "ms", "toute", 25, 2,
  420, 54, 26, 10, 6, 50,
  [("Nouilles soba (sarrasin)", "150 g", ["nouilles completes"]),
   ("Crevettes", "200 g", ["poulet", "tofu"]),
   ("Legumes wok", "300 g", []),
   ("Sauce soja + gingembre", "2 c. a soupe", [])],
  ["Cuisez les soba selon le paquet, egouttez.",
   "Faites sauter crevettes et legumes 6 min.",
   "Ajoutez nouilles, soja et gingembre, melangez."],
  ["asiatique", "rapide", "complet"], "wok nouilles soba crevettes")

# ============================ EXTRAS ============================
R("Oeuf dur, avocat et pain complet", "oeuf", "m", "toute", 12, 1,
  340, 22, 16, 21, 7, 35,
  [("Oeufs", "3", []),
   ("Avocat", "1", []),
   ("Pain complet", "2 tranches", ["pain de seigle"]),
   ("Citron + piment", "selon gout", [])],
  ["Cuisez les oeufs durs 9 min.",
   "Ecrasez l'avocat avec citron sur le pain.",
   "Ajoutez les oeufs en rondelles, sel, piment."],
  ["vegetarien", "rapide", "express"], "oeuf dur avocat tartine")

R("Saute de tofu aux legumes", "vege", "ms", "toute", 25, 2,
  320, 18, 22, 17, 6, 40,
  [("Tofu ferme", "250 g", ["poulet", "oeufs"]),
   ("Brocoli + poivron + carotte", "400 g", []),
   ("Sauce soja + gingembre + ail", "2 c. a soupe", []),
   ("Huile + graines de sesame", "1 c. + 1 c.", [])],
  ["Coupez et dorez le tofu 6 min, reservez.",
   "Faites sauter les legumes 7 min.",
   "Remettez le tofu, sauce soja, ail, gingembre, sesame."],
  ["vegetarien", "proteine vegetale", "asiatique"], "saute tofu legumes")

R("Soupe de tomate et vermicelles complets", "soupe", "ms", "toute", 25, 1,
  240, 36, 9, 6, 6, 45,
  [("Tomates concassees", "800 g", ["tomates fraiches"]),
   ("Oignon + ail", "1 + 1", []),
   ("Vermicelles complets", "60 g", ["petites pates completes"]),
   ("Basilic + huile d'olive", "selon gout", [])],
  ["Faites revenir oignon et ail, ajoutez les tomates et 50 cl d'eau.",
   "Mijotez 12 min, mixez si desire.",
   "Ajoutez les vermicelles 5 min, basilic."],
  ["vegetarien", "rapide", "reconfortant"], "soupe tomate vermicelles")

R("Salade de quinoa, concombre et feta", "vege", "m", "ete", 20, 1,
  380, 42, 15, 16, 9, 40,
  [("Quinoa", "100 g cru", ["boulgour"]),
   ("Concombre + tomates", "1 + 2", []),
   ("Feta", "60 g", []),
   ("Menthe + citron + huile", "selon gout", [])],
  ["Cuisez le quinoa 12 min, refroidissez.",
   "Ajoutez legumes en des, feta et herbes.",
   "Assaisonnez citron-huile."],
  ["vegetarien", "froid", "complet", "fibres"], "salade quinoa concombre feta")

R("Poelee de haricots verts, amandes et poulet", "volaille", "ms", "toute", 25, 2,
  350, 12, 34, 18, 6, 30,
  [("Blancs de poulet", "2", ["dinde", "tofu"]),
   ("Haricots verts", "400 g", ["brocoli"]),
   ("Amandes effilees", "30 g", ["noisettes"]),
   ("Ail + huile d'olive", "1 + 1 c.", [])],
  ["Cuisez les haricots verts 8 min, egouttez.",
   "Poelez le poulet en des 8 min avec l'ail.",
   "Ajoutez haricots et amandes dorees, melangez."],
  ["proteine", "fibres", "ig bas"], "poelee haricots verts poulet amandes")

R("Cabillaud vapeur et ratatouille", "poisson", "ms", "ete,automne", 35, 2,
  290, 18, 34, 9, 7, 30,
  [("Dos de cabillaud", "2", ["colin", "lieu"]),
   ("Ratatouille (maison ou bocal)", "400 g", ["legumes du soleil"]),
   ("Citron + basilic", "selon gout", [])],
  ["Rechauffez ou preparez la ratatouille.",
   "Cuisez le cabillaud vapeur 10 min.",
   "Servez le poisson sur la ratatouille, citron et basilic."],
  ["leger", "ig bas", "sans matiere grasse"], "cabillaud ratatouille")

R("Veloute de lentilles corail et carotte", "soupe", "ms", "automne,hiver", 30, 1,
  280, 36, 16, 6, 11, 30,
  [("Lentilles corail", "150 g", ["lentilles vertes"]),
   ("Carottes", "3", ["potiron"]),
   ("Oignon + cumin", "1 + 1 c.", []),
   ("Lait de coco", "10 cl", ["creme"]),
   ("Bouillon", "75 cl", [])],
  ["Faites revenir oignon, carottes et cumin.",
   "Ajoutez lentilles et bouillon, cuisez 20 min.",
   "Mixez, ajoutez le lait de coco."],
  ["vegetarien", "fibres", "ig bas", "reconfortant"], "veloute lentilles corail carotte")


# ============================ GENERATION ============================
def slugify(s):
    return urllib.parse.quote_plus(s)


# Substituts "plaisir" : alternatives gourmandes (pas forcement IG bas) pour
# faire plaisir a toute la famille. Associes par mot-cle a l'ingredient-legume.
PLAISIR = [
    ("haricots verts", ["frites maison", "pates", "gratin de pommes de terre"]),
    ("haricot vert", ["frites maison", "pates"]),
    ("chou-fleur", ["pommes de terre vapeur", "pates", "gratin dauphinois"]),
    ("epinard", ["pates", "frites maison", "puree maison"]),
    ("brocoli", ["pates", "gratin de pommes de terre", "frites maison"]),
    ("courgette", ["pates", "riz blanc", "frites maison"]),
    ("ratatouille", ["pates", "riz blanc", "frites maison"]),
    ("salade verte", ["frites maison", "pommes de terre sautees"]),
    ("poireau", ["pommes de terre", "pates"]),
    ("champignon", ["pates", "riz blanc"]),
    ("carotte", ["pommes de terre", "frites maison"]),
    ("potiron", ["pommes de terre", "pates"]),
    ("potimarron", ["pommes de terre", "pates"]),
    ("lentilles", ["riz blanc", "pates"]),
    ("legumes", ["riz blanc", "pates", "frites maison"]),
    ("chou", ["pommes de terre", "pates"]),
    ("quinoa", ["riz blanc", "pates"]),
    ("boulgour", ["riz blanc", "pates"]),
]


def plaisir_for(nom):
    n = nom.lower()
    for key, opts in PLAISIR:
        if key in n:
            return opts
    return None


def build():
    seen = set()
    for idx, r in enumerate(RECIPES, start=1):
        r["id"] = "r%03d" % idx
        if r["nom"] in seen:
            raise SystemExit("Doublon de nom: " + r["nom"])
        seen.add(r["nom"])
        r["lien"] = "https://www.marmiton.org/recettes/recherche.aspx?aqt=" + slugify(r["marm"])
        # label IG
        ig = r["ig"]
        r["ig_label"] = "bas" if ig <= 50 else ("modere" if ig < 70 else "eleve")
        # charge glycemique estimee par portion (IG x glucides / 100)
        r["cg"] = round(ig * r["nutrition"]["glucides"] / 100)
        r["cg_label"] = "basse" if r["cg"] <= 10 else ("moderee" if r["cg"] < 20 else "elevee")
        # substituts plaisir
        for ing in r["ingredients"]:
            opts = plaisir_for(ing["nom"])
            if opts:
                ing["plaisir"] = opts
        del r["marm"]

    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, "..", "data", "recipes.json")
    payload = {
        "version": 2,
        "generated_for": "outil repas diabetique",
        "base_servings": 2,
        "note": "Valeurs nutritionnelles approximatives par portion. IG = index glycemique global estime. CG = charge glycemique.",
        "count": len(RECIPES),
        "recipes": RECIPES,
    }
    with open(out, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=1)
    print("OK -> %d recettes ecrites dans data/recipes.json" % len(RECIPES))
    # petit recap familles
    from collections import Counter
    print(Counter(r["famille"] for r in RECIPES))
    nb_plaisir = sum(1 for r in RECIPES for i in r["ingredients"] if i.get("plaisir"))
    print("ingredients avec substitut plaisir:", nb_plaisir)


if __name__ == "__main__":
    build()

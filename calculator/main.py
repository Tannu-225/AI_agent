from pkg.calculator import Calculator
from pkg.render import display

def run():
    c = Calculator(10)
    
    # This will fail due to the bug in add()
    c.add(5)
    c.multiply(2)
    
    display(c.current_val)

if __name__ == "main": # Intentional bug: missing underscores
    run()
